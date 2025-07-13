#!/bin/bash

# Health Monitoring and Alerting Script for Nutrition AI
# Continuous monitoring with alerting for critical system and application metrics
# Usage: ./scripts/health-monitor.sh [monitor|check|alert|daemon] [options]

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
APP_NAME="nutrition-ai"
LOG_FILE="/var/log/${APP_NAME}/health-monitor.log"
ALERT_LOG="/var/log/${APP_NAME}/alerts.log"

# Monitoring configuration
CHECK_INTERVAL=${CHECK_INTERVAL:-60}  # seconds
DAEMON_MODE=${DAEMON_MODE:-false}
ALERT_COOLDOWN=${ALERT_COOLDOWN:-300}  # 5 minutes

# Health check thresholds
CPU_THRESHOLD=${CPU_THRESHOLD:-80}
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-85}
DISK_THRESHOLD=${DISK_THRESHOLD:-90}
LOAD_THRESHOLD=${LOAD_THRESHOLD:-4.0}
RESPONSE_TIME_THRESHOLD=${RESPONSE_TIME_THRESHOLD:-5000}  # milliseconds

# Alert configuration
ALERT_EMAIL=${ALERT_EMAIL:-""}
ALERT_WEBHOOK=${ALERT_WEBHOOK:-""}
ALERT_SLACK_WEBHOOK=${ALERT_SLACK_WEBHOOK:-""}
ENABLE_ALERTS=${ENABLE_ALERTS:-true}

# Service endpoints
API_BASE_URL=${API_BASE_URL:-"http://localhost:8000"}
HEALTH_ENDPOINT="$API_BASE_URL/api/health/"
READINESS_ENDPOINT="$API_BASE_URL/api/readiness/"
METRICS_ENDPOINT="$API_BASE_URL/api/metrics/"

# Alert tracking
ALERT_STATE_FILE="/tmp/${APP_NAME}_alert_state.json"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${PURPLE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

alert() {
    local level="$1"
    local message="$2"
    local component="${3:-system}"
    
    echo -e "${RED}[ALERT] [$level] $message${NC}" | tee -a "$ALERT_LOG"
    
    # Send alert if enabled
    if [[ "$ENABLE_ALERTS" == "true" ]]; then
        send_alert "$level" "$message" "$component"
    fi
}

print_health_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   🏥 Health Monitor                          ║"
    echo "║                  Nutrition AI Infrastructure                  ║"
    echo "║                                                               ║"
    echo "║  Check Interval: ${CHECK_INTERVAL}s"
    echo "║  Alert Cooldown: ${ALERT_COOLDOWN}s"
    echo "║  Daemon Mode: $DAEMON_MODE"
    echo "║  Alerts Enabled: $ENABLE_ALERTS"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

get_system_metrics() {
    local metrics=()
    
    # CPU usage
    local cpu_usage
    if command -v top &> /dev/null; then
        cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    else
        cpu_usage=$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print int(usage)}')
    fi
    
    # Memory usage
    local memory_info
    memory_info=$(free | grep Mem)
    local total_mem=$(echo "$memory_info" | awk '{print $2}')
    local used_mem=$(echo "$memory_info" | awk '{print $3}')
    local memory_usage=$(echo "scale=1; $used_mem * 100 / $total_mem" | bc 2>/dev/null || echo "0")
    
    # Disk usage
    local disk_usage
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Load average
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    # System uptime
    local uptime_seconds
    uptime_seconds=$(awk '{print int($1)}' /proc/uptime)
    
    echo "{
        \"cpu_usage\": $cpu_usage,
        \"memory_usage\": $memory_usage,
        \"disk_usage\": $disk_usage,
        \"load_average\": $load_avg,
        \"uptime_seconds\": $uptime_seconds,
        \"timestamp\": \"$(date -Iseconds)\"
    }"
}

get_docker_metrics() {
    local metrics="{\"containers\": []}"
    
    if command -v docker &> /dev/null; then
        local containers_info
        containers_info=$(docker ps --format "{{.Names}},{{.Status}},{{.Image}}" 2>/dev/null || echo "")
        
        if [[ -n "$containers_info" ]]; then
            local container_array="["
            local first=true
            
            while IFS=',' read -r name status image; do
                if [[ "$first" != "true" ]]; then
                    container_array+=","
                fi
                first=false
                
                local state="unknown"
                if [[ "$status" == *"Up"* ]]; then
                    state="running"
                elif [[ "$status" == *"Exited"* ]]; then
                    state="stopped"
                fi
                
                container_array+="{
                    \"name\": \"$name\",
                    \"status\": \"$status\",
                    \"state\": \"$state\",
                    \"image\": \"$image\"
                }"
            done <<< "$containers_info"
            
            container_array+="]"
            metrics=$(echo "$metrics" | jq ".containers = $container_array")
        fi
    fi
    
    echo "$metrics"
}

get_application_metrics() {
    local metrics="{}"
    
    # Health check
    local health_status="unknown"
    local health_response_time=0
    
    if command -v curl &> /dev/null; then
        local start_time
        start_time=$(date +%s%3N)
        
        if curl -f -s --max-time 10 "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
            health_status="healthy"
            local end_time
            end_time=$(date +%s%3N)
            health_response_time=$((end_time - start_time))
        else
            health_status="unhealthy"
        fi
    fi
    
    # Readiness check
    local readiness_status="unknown"
    if command -v curl &> /dev/null; then
        if curl -f -s --max-time 10 "$READINESS_ENDPOINT" > /dev/null 2>&1; then
            readiness_status="ready"
        else
            readiness_status="not_ready"
        fi
    fi
    
    # SSL certificate check
    local ssl_status="unknown"
    local ssl_days_left=0
    
    if [[ -f "$BACKEND_DIR/ssl/cert.pem" ]]; then
        local cert_expiry
        cert_expiry=$(openssl x509 -enddate -noout -in "$BACKEND_DIR/ssl/cert.pem" 2>/dev/null | cut -d= -f2 || echo "")
        
        if [[ -n "$cert_expiry" ]]; then
            local expiry_epoch
            expiry_epoch=$(date -d "$cert_expiry" +%s 2>/dev/null || echo "0")
            local current_epoch
            current_epoch=$(date +%s)
            ssl_days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [[ $ssl_days_left -gt 30 ]]; then
                ssl_status="valid"
            elif [[ $ssl_days_left -gt 7 ]]; then
                ssl_status="expiring_soon"
            else
                ssl_status="critical"
            fi
        fi
    fi
    
    echo "{
        \"health\": {
            \"status\": \"$health_status\",
            \"response_time_ms\": $health_response_time
        },
        \"readiness\": {
            \"status\": \"$readiness_status\"
        },
        \"ssl\": {
            \"status\": \"$ssl_status\",
            \"days_left\": $ssl_days_left
        },
        \"timestamp\": \"$(date -Iseconds)\"
    }"
}

check_thresholds() {
    local system_metrics="$1"
    local app_metrics="$2"
    local alerts_triggered=()
    
    # Check CPU threshold
    local cpu_usage
    cpu_usage=$(echo "$system_metrics" | jq -r '.cpu_usage')
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        alerts_triggered+=("HIGH_CPU:CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)")
    fi
    
    # Check memory threshold
    local memory_usage
    memory_usage=$(echo "$system_metrics" | jq -r '.memory_usage')
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        alerts_triggered+=("HIGH_MEMORY:Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)")
    fi
    
    # Check disk threshold
    local disk_usage
    disk_usage=$(echo "$system_metrics" | jq -r '.disk_usage')
    if [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
        alerts_triggered+=("HIGH_DISK:Disk usage is ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)")
    fi
    
    # Check load average
    local load_avg
    load_avg=$(echo "$system_metrics" | jq -r '.load_average')
    if (( $(echo "$load_avg > $LOAD_THRESHOLD" | bc -l) )); then
        alerts_triggered+=("HIGH_LOAD:Load average is ${load_avg} (threshold: ${LOAD_THRESHOLD})")
    fi
    
    # Check application health
    local health_status
    health_status=$(echo "$app_metrics" | jq -r '.health.status')
    if [[ "$health_status" != "healthy" ]]; then
        alerts_triggered+=("APP_UNHEALTHY:Application health check failed")
    fi
    
    # Check response time
    local response_time
    response_time=$(echo "$app_metrics" | jq -r '.health.response_time_ms')
    if [[ $response_time -gt $RESPONSE_TIME_THRESHOLD ]]; then
        alerts_triggered+=("SLOW_RESPONSE:Response time is ${response_time}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)")
    fi
    
    # Check SSL certificate
    local ssl_status
    ssl_status=$(echo "$app_metrics" | jq -r '.ssl.status')
    local ssl_days
    ssl_days=$(echo "$app_metrics" | jq -r '.ssl.days_left')
    
    case "$ssl_status" in
        "critical")
            alerts_triggered+=("SSL_CRITICAL:SSL certificate expires in ${ssl_days} days")
            ;;
        "expiring_soon")
            alerts_triggered+=("SSL_WARNING:SSL certificate expires in ${ssl_days} days")
            ;;
    esac
    
    # Return alerts
    printf '%s\n' "${alerts_triggered[@]}"
}

should_send_alert() {
    local alert_key="$1"
    local current_time
    current_time=$(date +%s)
    
    # Load alert state
    local last_alert_time=0
    if [[ -f "$ALERT_STATE_FILE" ]]; then
        last_alert_time=$(jq -r ".\"$alert_key\" // 0" "$ALERT_STATE_FILE" 2>/dev/null || echo "0")
    fi
    
    # Check cooldown
    local time_diff=$((current_time - last_alert_time))
    if [[ $time_diff -ge $ALERT_COOLDOWN ]]; then
        # Update alert state
        local new_state="{}"
        if [[ -f "$ALERT_STATE_FILE" ]]; then
            new_state=$(cat "$ALERT_STATE_FILE")
        fi
        new_state=$(echo "$new_state" | jq ".\"$alert_key\" = $current_time")
        echo "$new_state" > "$ALERT_STATE_FILE"
        
        return 0  # Should send alert
    else
        return 1  # In cooldown period
    fi
}

send_alert() {
    local level="$1"
    local message="$2"
    local component="$3"
    local alert_key="${component}_${level}"
    
    # Check cooldown
    if ! should_send_alert "$alert_key"; then
        return 0
    fi
    
    local timestamp
    timestamp=$(date -Iseconds)
    local hostname
    hostname=$(hostname)
    
    # Email alert
    if [[ -n "$ALERT_EMAIL" ]] && command -v mail &> /dev/null; then
        echo "Alert from $APP_NAME on $hostname at $timestamp: $message" | \
        mail -s "[$level] $APP_NAME Alert: $component" "$ALERT_EMAIL" || true
    fi
    
    # Webhook alert
    if [[ -n "$ALERT_WEBHOOK" ]] && command -v curl &> /dev/null; then
        curl -X POST "$ALERT_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{
                 \"level\": \"$level\",
                 \"message\": \"$message\",
                 \"component\": \"$component\",
                 \"hostname\": \"$hostname\",
                 \"timestamp\": \"$timestamp\",
                 \"app\": \"$APP_NAME\"
             }" &> /dev/null || true
    fi
    
    # Slack alert
    if [[ -n "$ALERT_SLACK_WEBHOOK" ]] && command -v curl &> /dev/null; then
        local emoji="⚠️"
        local color="warning"
        
        case "$level" in
            "CRITICAL")
                emoji="🚨"
                color="danger"
                ;;
            "WARNING")
                emoji="⚠️"
                color="warning"
                ;;
            "INFO")
                emoji="ℹ️"
                color="good"
                ;;
        esac
        
        curl -X POST "$ALERT_SLACK_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{
                 \"attachments\": [{
                     \"color\": \"$color\",
                     \"title\": \"$emoji $APP_NAME Alert\",
                     \"text\": \"$message\",
                     \"fields\": [
                         {\"title\": \"Level\", \"value\": \"$level\", \"short\": true},
                         {\"title\": \"Component\", \"value\": \"$component\", \"short\": true},
                         {\"title\": \"Host\", \"value\": \"$hostname\", \"short\": true},
                         {\"title\": \"Time\", \"value\": \"$timestamp\", \"short\": true}
                     ]
                 }]
             }" &> /dev/null || true
    fi
}

run_health_check() {
    log "Running comprehensive health check..."
    
    # Collect metrics
    local system_metrics
    system_metrics=$(get_system_metrics)
    
    local docker_metrics
    docker_metrics=$(get_docker_metrics)
    
    local app_metrics
    app_metrics=$(get_application_metrics)
    
    # Check thresholds and generate alerts
    local alerts
    alerts=$(check_thresholds "$system_metrics" "$app_metrics")
    
    # Process alerts
    if [[ -n "$alerts" ]]; then
        while IFS=':' read -r alert_type alert_message; do
            if [[ -n "$alert_type" ]] && [[ -n "$alert_message" ]]; then
                case "$alert_type" in
                    *"CRITICAL"*|*"UNHEALTHY"*)
                        alert "CRITICAL" "$alert_message" "application"
                        ;;
                    *"HIGH"*|*"SLOW"*)
                        alert "WARNING" "$alert_message" "system"
                        ;;
                    *"WARNING"*)
                        alert "WARNING" "$alert_message" "ssl"
                        ;;
                esac
            fi
        done <<< "$alerts"
    fi
    
    # Display summary
    display_health_summary "$system_metrics" "$docker_metrics" "$app_metrics"
    
    success "Health check completed"
}

display_health_summary() {
    local system_metrics="$1"
    local docker_metrics="$2"
    local app_metrics="$3"
    
    # Extract key metrics
    local cpu_usage
    cpu_usage=$(echo "$system_metrics" | jq -r '.cpu_usage')
    local memory_usage
    memory_usage=$(echo "$system_metrics" | jq -r '.memory_usage')
    local disk_usage
    disk_usage=$(echo "$system_metrics" | jq -r '.disk_usage')
    local health_status
    health_status=$(echo "$app_metrics" | jq -r '.health.status')
    local ssl_status
    ssl_status=$(echo "$app_metrics" | jq -r '.ssl.status')
    
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                     Health Summary                           ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    printf "║  🖥️  CPU Usage: %-45s ║\n" "${cpu_usage}%"
    printf "║  🧠 Memory Usage: %-42s ║\n" "${memory_usage}%"
    printf "║  💾 Disk Usage: %-44s ║\n" "${disk_usage}%"
    printf "║  🏥 App Health: %-44s ║\n" "$health_status"
    printf "║  🔒 SSL Status: %-44s ║\n" "$ssl_status"
    echo "║                                                               ║"
    
    # Container status
    local container_count
    container_count=$(echo "$docker_metrics" | jq '.containers | length')
    local running_count
    running_count=$(echo "$docker_metrics" | jq '.containers | map(select(.state == "running")) | length')
    
    printf "║  🐳 Containers: %-43s ║\n" "${running_count}/${container_count} running"
    printf "║  ⏰ Checked: %-46s ║\n" "$(date)"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

start_daemon() {
    log "Starting health monitoring daemon..."
    
    # Create PID file
    local pid_file="/var/run/${APP_NAME}-health-monitor.pid"
    echo $$ > "$pid_file"
    
    # Setup signal handlers
    trap 'log "Stopping health monitoring daemon..."; rm -f "$pid_file"; exit 0' SIGTERM SIGINT
    
    info "Health monitoring daemon started (PID: $$)"
    info "Check interval: ${CHECK_INTERVAL} seconds"
    
    while true; do
        run_health_check
        sleep "$CHECK_INTERVAL"
    done
}

stop_daemon() {
    local pid_file="/var/run/${APP_NAME}-health-monitor.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file")
        
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping health monitoring daemon (PID: $pid)..."
            kill "$pid"
            rm -f "$pid_file"
            success "Health monitoring daemon stopped"
        else
            warning "Health monitoring daemon not running (stale PID file)"
            rm -f "$pid_file"
        fi
    else
        warning "Health monitoring daemon not running (no PID file)"
    fi
}

show_health_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  check        - Run single health check (default)"
    echo "  monitor      - Start monitoring daemon"
    echo "  stop         - Stop monitoring daemon"
    echo "  alert TEST   - Test alert system"
    echo ""
    echo "Environment Variables:"
    echo "  CHECK_INTERVAL            - Check interval in seconds (default: 60)"
    echo "  CPU_THRESHOLD            - CPU usage alert threshold % (default: 80)"
    echo "  MEMORY_THRESHOLD         - Memory usage alert threshold % (default: 85)"
    echo "  DISK_THRESHOLD          - Disk usage alert threshold % (default: 90)"
    echo "  RESPONSE_TIME_THRESHOLD  - Response time threshold ms (default: 5000)"
    echo "  ALERT_EMAIL             - Email address for alerts"
    echo "  ALERT_WEBHOOK           - Webhook URL for alerts"
    echo "  ALERT_SLACK_WEBHOOK     - Slack webhook URL for alerts"
    echo "  ENABLE_ALERTS           - Enable alerting (default: true)"
    echo ""
    echo "Examples:"
    echo "  $0 check                              # Single health check"
    echo "  $0 monitor                            # Start daemon"
    echo "  CHECK_INTERVAL=30 $0 monitor          # Monitor every 30 seconds"
    echo "  $0 alert \"Test alert message\"        # Test alerts"
    echo ""
}

main() {
    # Setup logging
    mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$ALERT_LOG")" 2>/dev/null || true
    
    # Parse command
    local command="${1:-check}"
    
    case "$command" in
        "check")
            print_health_banner
            run_health_check
            success "🏥 Health check completed!"
            ;;
        "monitor")
            print_health_banner
            start_daemon
            ;;
        "stop")
            stop_daemon
            ;;
        "alert")
            local test_message="${2:-Test alert from health monitor}"
            send_alert "WARNING" "$test_message" "test"
            success "Test alert sent"
            ;;
        "help"|"-h"|"--help")
            show_health_usage
            ;;
        *)
            error "Unknown command: $command"
            show_health_usage
            exit 1
            ;;
    esac
}

# Install required packages if missing
if ! command -v jq &> /dev/null; then
    warning "jq not found, installing..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y jq bc
    elif command -v yum &> /dev/null; then
        sudo yum install -y jq bc
    fi
fi

# Run main function with all arguments
main "$@"