"""
Django management command to generate Postman collection from API schema.
"""
import json
import os
from django.core.management.base import BaseCommand
from django.urls import reverse
from rest_framework.test import APIRequestFactory
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.openapi import AutoSchema


class Command(BaseCommand):
    """Generate Postman collection from OpenAPI schema."""
    
    help = 'Generate Postman collection from API schema'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--output',
            type=str,
            default='postman_collection.json',
            help='Output file path for Postman collection'
        )
        parser.add_argument(
            '--base-url',
            type=str,
            default='http://localhost:8000',
            help='Base URL for API endpoints'
        )
    
    def handle(self, *args, **options):
        """Execute command."""
        output_file = options['output']
        base_url = options['base_url']
        
        self.stdout.write('Generating OpenAPI schema...')
        
        # Generate OpenAPI schema
        generator = SchemaGenerator()
        schema = generator.get_schema()
        
        self.stdout.write('Converting to Postman collection...')
        
        # Convert to Postman collection
        collection = self.openapi_to_postman(schema, base_url)
        
        # Save to file
        output_path = os.path.join('docs', output_file)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(collection, f, indent=2)
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully generated Postman collection: {output_path}')
        )
    
    def openapi_to_postman(self, schema, base_url):
        """Convert OpenAPI schema to Postman collection format."""
        collection = {
            'info': {
                'name': schema.get('info', {}).get('title', 'API Collection'),
                'description': schema.get('info', {}).get('description', ''),
                'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
                'version': schema.get('info', {}).get('version', '1.0.0')
            },
            'item': [],
            'auth': {
                'type': 'bearer',
                'bearer': [
                    {
                        'key': 'token',
                        'value': '{{access_token}}',
                        'type': 'string'
                    }
                ]
            },
            'variable': [
                {
                    'key': 'base_url',
                    'value': base_url,
                    'type': 'string'
                },
                {
                    'key': 'access_token',
                    'value': '',
                    'type': 'string'
                },
                {
                    'key': 'refresh_token',
                    'value': '',
                    'type': 'string'
                }
            ]
        }
        
        # Group endpoints by tags
        folders = {}
        
        for path, path_item in schema.get('paths', {}).items():
            for method, operation in path_item.items():
                if method in ['get', 'post', 'put', 'patch', 'delete']:
                    # Get tags
                    tags = operation.get('tags', ['Other'])
                    tag = tags[0] if tags else 'Other'
                    
                    # Create folder if not exists
                    if tag not in folders:
                        folders[tag] = {
                            'name': tag.title(),
                            'item': [],
                            'description': f'{tag} operations'
                        }
                    
                    # Create request
                    request = self.create_postman_request(
                        path, method, operation, base_url
                    )
                    
                    folders[tag]['item'].append(request)
        
        # Add folders to collection
        collection['item'] = list(folders.values())
        
        # Add example requests
        self.add_example_requests(collection)
        
        return collection
    
    def create_postman_request(self, path, method, operation, base_url):
        """Create a Postman request from OpenAPI operation."""
        # Replace path parameters with Postman variables
        postman_path = path
        if '{' in path:
            import re
            postman_path = re.sub(r'\{(\w+)\}', r':{$1}', path)
        
        request = {
            'name': operation.get('summary', f'{method.upper()} {path}'),
            'request': {
                'method': method.upper(),
                'header': [],
                'url': {
                    'raw': f'{{{{base_url}}}}{postman_path}',
                    'host': ['{{base_url}}'],
                    'path': postman_path.strip('/').split('/')
                },
                'description': operation.get('description', '')
            }
        }
        
        # Add headers
        if 'application/json' in str(operation.get('requestBody', {})):
            request['request']['header'].append({
                'key': 'Content-Type',
                'value': 'application/json',
                'type': 'text'
            })
        
        # Add request body
        if 'requestBody' in operation:
            body_schema = operation['requestBody'].get('content', {}).get(
                'application/json', {}
            ).get('schema', {})
            
            request['request']['body'] = {
                'mode': 'raw',
                'raw': json.dumps(
                    self.generate_example_from_schema(body_schema),
                    indent=2
                ),
                'options': {
                    'raw': {
                        'language': 'json'
                    }
                }
            }
        
        # Add query parameters
        if 'parameters' in operation:
            query = []
            for param in operation['parameters']:
                if param.get('in') == 'query':
                    query.append({
                        'key': param['name'],
                        'value': '',
                        'description': param.get('description', ''),
                        'disabled': not param.get('required', False)
                    })
            
            if query:
                request['request']['url']['query'] = query
        
        # Add tests
        request['event'] = [
            {
                'listen': 'test',
                'script': {
                    'exec': self.generate_tests_for_endpoint(path, method),
                    'type': 'text/javascript'
                }
            }
        ]
        
        return request
    
    def generate_example_from_schema(self, schema):
        """Generate example data from JSON schema."""
        if '$ref' in schema:
            # Handle references (simplified)
            return {}
        
        schema_type = schema.get('type', 'object')
        
        if schema_type == 'object':
            example = {}
            for prop, prop_schema in schema.get('properties', {}).items():
                example[prop] = self.generate_example_from_schema(prop_schema)
            return example
        
        elif schema_type == 'array':
            item_schema = schema.get('items', {})
            return [self.generate_example_from_schema(item_schema)]
        
        elif schema_type == 'string':
            if 'format' in schema:
                if schema['format'] == 'email':
                    return 'user@example.com'
                elif schema['format'] == 'date':
                    return '2025-01-09'
                elif schema['format'] == 'date-time':
                    return '2025-01-09T12:00:00Z'
            return schema.get('example', 'string')
        
        elif schema_type == 'number':
            return schema.get('example', 0)
        
        elif schema_type == 'integer':
            return schema.get('example', 1)
        
        elif schema_type == 'boolean':
            return schema.get('example', True)
        
        return None
    
    def generate_tests_for_endpoint(self, path, method):
        """Generate Postman tests for endpoint."""
        tests = [
            "// Test response status",
            "pm.test('Status code is successful', function () {",
            "    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);",
            "});",
            "",
            "// Test response time",
            "pm.test('Response time is less than 1000ms', function () {",
            "    pm.expect(pm.response.responseTime).to.be.below(1000);",
            "});",
            "",
            "// Test content type",
            "pm.test('Response has JSON content type', function () {",
            "    pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json');",
            "});",
        ]
        
        # Add specific tests based on endpoint
        if '/auth/login' in path and method == 'post':
            tests.extend([
                "",
                "// Save tokens",
                "if (pm.response.code === 200) {",
                "    const jsonData = pm.response.json();",
                "    pm.collectionVariables.set('access_token', jsonData.access);",
                "    pm.collectionVariables.set('refresh_token', jsonData.refresh);",
                "}"
            ])
        
        elif '/auth/refresh' in path and method == 'post':
            tests.extend([
                "",
                "// Update tokens",
                "if (pm.response.code === 200) {",
                "    const jsonData = pm.response.json();",
                "    pm.collectionVariables.set('access_token', jsonData.access);",
                "    pm.collectionVariables.set('refresh_token', jsonData.refresh);",
                "}"
            ])
        
        return tests
    
    def add_example_requests(self, collection):
        """Add example requests to help users get started."""
        examples = {
            'name': 'Examples',
            'item': [
                {
                    'name': 'Complete Authentication Flow',
                    'item': [
                        {
                            'name': '1. Register New User',
                            'request': {
                                'method': 'POST',
                                'header': [
                                    {
                                        'key': 'Content-Type',
                                        'value': 'application/json'
                                    }
                                ],
                                'body': {
                                    'mode': 'raw',
                                    'raw': json.dumps({
                                        'email': 'newuser@example.com',
                                        'password': 'StrongPass123!',
                                        'password_confirm': 'StrongPass123!',
                                        'first_name': 'Test',
                                        'last_name': 'User',
                                        'terms_accepted': True
                                    }, indent=2)
                                },
                                'url': {
                                    'raw': '{{base_url}}/api/v1/auth/register/',
                                    'host': ['{{base_url}}'],
                                    'path': ['api', 'v1', 'auth', 'register', '']
                                }
                            }
                        },
                        {
                            'name': '2. Login',
                            'request': {
                                'method': 'POST',
                                'header': [
                                    {
                                        'key': 'Content-Type',
                                        'value': 'application/json'
                                    }
                                ],
                                'body': {
                                    'mode': 'raw',
                                    'raw': json.dumps({
                                        'email': 'newuser@example.com',
                                        'password': 'StrongPass123!'
                                    }, indent=2)
                                },
                                'url': {
                                    'raw': '{{base_url}}/api/v1/auth/login/',
                                    'host': ['{{base_url}}'],
                                    'path': ['api', 'v1', 'auth', 'login', '']
                                }
                            },
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'exec': [
                                            "if (pm.response.code === 200) {",
                                            "    const jsonData = pm.response.json();",
                                            "    pm.collectionVariables.set('access_token', jsonData.access);",
                                            "    pm.collectionVariables.set('refresh_token', jsonData.refresh);",
                                            "    console.log('Tokens saved to collection variables');",
                                            "}"
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        collection['item'].append(examples)