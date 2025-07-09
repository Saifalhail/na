from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from datetime import date, datetime
from decimal import Decimal

from api.models import UserProfile, DietaryRestriction

User = get_user_model()


class UserModelTest(TestCase):
    """Test cases for the custom User model."""
    
    def setUp(self):
        """Set up test data."""
        self.valid_user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
        }
    
    def test_create_user_with_email(self):
        """Test creating a user with email as primary field."""
        user = User.objects.create_user(**self.valid_user_data)
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.username, 'testuser')
        self.assertTrue(user.check_password('testpass123'))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_verified)
        self.assertEqual(user.account_type, 'free')
    
    def test_create_superuser(self):
        """Test creating a superuser."""
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User'
        )
        
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
    
    def test_unique_email_constraint(self):
        """Test that email must be unique."""
        User.objects.create_user(**self.valid_user_data)
        
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username='anotheruser',
                email='test@example.com',  # Same email
                password='pass123',
                first_name='Another',
                last_name='User'
            )
    
    def test_user_string_representation(self):
        """Test the string representation of User."""
        user = User.objects.create_user(**self.valid_user_data)
        self.assertEqual(str(user), 'test@example.com')
    
    def test_get_full_name(self):
        """Test get_full_name method."""
        user = User.objects.create_user(**self.valid_user_data)
        self.assertEqual(user.get_full_name(), 'Test User')
        
        # Test with empty names
        user.first_name = ''
        user.last_name = ''
        user.save()
        self.assertEqual(user.get_full_name(), 'test@example.com')
    
    def test_get_short_name(self):
        """Test get_short_name method."""
        user = User.objects.create_user(**self.valid_user_data)
        self.assertEqual(user.get_short_name(), 'Test')
        
        # Test with empty first name
        user.first_name = ''
        user.save()
        self.assertEqual(user.get_short_name(), 'test')  # email prefix
    
    def test_account_type_choices(self):
        """Test account type field choices."""
        user = User.objects.create_user(**self.valid_user_data)
        
        # Test valid choices
        for account_type, _ in User.ACCOUNT_TYPE_CHOICES:
            user.account_type = account_type
            user.full_clean()  # Should not raise
        
        # Test invalid choice
        user.account_type = 'invalid'
        with self.assertRaises(ValidationError):
            user.full_clean()
    
    def test_optional_fields(self):
        """Test optional fields can be blank."""
        user = User.objects.create_user(
            username='minimal',
            email='minimal@example.com',
            password='pass123',
            first_name='Min',
            last_name='User'
        )
        
        # These should all be blank/null by default
        self.assertEqual(user.phone_number, '')
        self.assertIsNone(user.date_of_birth)
        self.assertIsNone(user.last_login_ip)
    
    def test_auto_generated_fields(self):
        """Test auto-generated fields."""
        user = User.objects.create_user(**self.valid_user_data)
        
        self.assertIsNotNone(user.verification_token)
        self.assertIsNotNone(user.created_at)
        self.assertIsNotNone(user.updated_at)
        self.assertIsInstance(user.created_at, datetime)
        self.assertIsInstance(user.updated_at, datetime)
    
    def test_model_indexes(self):
        """Test that proper indexes are created."""
        # This tests that the model definition includes indexes
        # The actual index creation is handled by migrations
        indexes = User._meta.indexes
        index_fields = [index.fields for index in indexes]
        
        self.assertIn(['email'], index_fields)
        self.assertIn(['is_verified'], index_fields)
        self.assertIn(['account_type'], index_fields)
        self.assertIn(['created_at'], index_fields)


class UserProfileModelTest(TestCase):
    """Test cases for the UserProfile model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            date_of_birth=date(1990, 1, 1)
        )
    
    def test_create_user_profile(self):
        """Test creating a user profile."""
        profile = UserProfile.objects.create(
            user=self.user,
            gender='M',
            height=Decimal('180.00'),
            weight=Decimal('75.00'),
            activity_level='moderately_active'
        )
        
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.gender, 'M')
        self.assertEqual(profile.height, Decimal('180.00'))
        self.assertEqual(profile.weight, Decimal('75.00'))
        self.assertEqual(profile.measurement_system, 'metric')  # default
        self.assertEqual(profile.timezone, 'UTC')  # default
        self.assertEqual(profile.language, 'en')  # default
    
    def test_one_to_one_relationship(self):
        """Test one-to-one relationship with User."""
        profile = UserProfile.objects.create(user=self.user)
        
        # Test reverse relationship
        self.assertEqual(self.user.profile, profile)
        
        # Test can't create duplicate profile
        with self.assertRaises(IntegrityError):
            UserProfile.objects.create(user=self.user)
    
    def test_bmi_calculation(self):
        """Test BMI calculation on save."""
        profile = UserProfile.objects.create(
            user=self.user,
            height=Decimal('180.00'),  # 180 cm
            weight=Decimal('75.00'),    # 75 kg
            gender='M'
        )
        
        # BMI = weight / (height_in_meters^2) = 75 / (1.8^2) = 23.1
        self.assertAlmostEqual(profile.bmi, Decimal('23.1'), places=1)
    
    def test_bmr_calculation_male(self):
        """Test BMR calculation for male."""
        profile = UserProfile.objects.create(
            user=self.user,
            height=Decimal('180.00'),
            weight=Decimal('75.00'),
            gender='M'
        )
        
        # BMR = 10 × 75 + 6.25 × 180 - 5 × age + 5
        # Age = current_year - 1990 (will vary based on when test runs)
        age = date.today().year - 1990
        expected_bmr = 10 * 75 + 6.25 * 180 - 5 * age + 5
        
        self.assertEqual(profile.bmr, int(expected_bmr))
    
    def test_bmr_calculation_female(self):
        """Test BMR calculation for female."""
        profile = UserProfile.objects.create(
            user=self.user,
            height=Decimal('165.00'),
            weight=Decimal('60.00'),
            gender='F'
        )
        
        # BMR = 10 × 60 + 6.25 × 165 - 5 × age - 161
        age = date.today().year - 1990
        expected_bmr = 10 * 60 + 6.25 * 165 - 5 * age - 161
        
        self.assertEqual(profile.bmr, int(expected_bmr))
    
    def test_tdee_calculation(self):
        """Test TDEE calculation based on activity level."""
        profile = UserProfile.objects.create(
            user=self.user,
            height=Decimal('180.00'),
            weight=Decimal('75.00'),
            gender='M',
            activity_level='very_active'
        )
        
        # TDEE = BMR × activity_multiplier (1.725 for very_active)
        expected_tdee = int(profile.bmr * 1.725)
        self.assertEqual(profile.tdee, expected_tdee)
    
    def test_get_age(self):
        """Test get_age method."""
        profile = UserProfile.objects.create(user=self.user)
        
        expected_age = date.today().year - 1990
        if date.today() < date(date.today().year, 1, 1):
            expected_age -= 1
        
        self.assertEqual(profile.get_age(), expected_age)
        
        # Test with no birth date
        self.user.date_of_birth = None
        self.user.save()
        self.assertIsNone(profile.get_age())
    
    def test_unit_conversion_methods(self):
        """Test weight and height conversion methods."""
        profile = UserProfile.objects.create(
            user=self.user,
            height=Decimal('180.00'),  # 180 cm
            weight=Decimal('75.00'),    # 75 kg
            measurement_system='imperial'
        )
        
        # Test weight conversion (kg to lbs)
        weight_lbs = profile.get_weight_in_preferred_unit()
        self.assertAlmostEqual(weight_lbs, 75 * 2.20462, places=2)
        
        # Test height conversion (cm to inches)
        height_inches = profile.get_height_in_preferred_unit()
        self.assertAlmostEqual(height_inches, 180 * 0.393701, places=2)
        
        # Test metric system (no conversion)
        profile.measurement_system = 'metric'
        profile.save()
        
        self.assertEqual(profile.get_weight_in_preferred_unit(), 75.0)
        self.assertEqual(profile.get_height_in_preferred_unit(), 180.0)
    
    def test_string_representation(self):
        """Test string representation of UserProfile."""
        profile = UserProfile.objects.create(user=self.user)
        self.assertEqual(str(profile), 'Profile for test@example.com')
    
    def test_optional_fields(self):
        """Test that optional fields can be blank."""
        profile = UserProfile.objects.create(user=self.user)
        
        # These should all be blank/null by default
        self.assertEqual(profile.gender, '')
        self.assertIsNone(profile.height)
        self.assertIsNone(profile.weight)
        self.assertIsNone(profile.daily_calorie_goal)
        self.assertEqual(profile.bio, '')
        self.assertFalse(profile.avatar)
    
    def test_privacy_settings_defaults(self):
        """Test privacy settings default values."""
        profile = UserProfile.objects.create(user=self.user)
        
        self.assertTrue(profile.receive_email_notifications)
        self.assertTrue(profile.receive_push_notifications)
        self.assertFalse(profile.show_nutritional_info_publicly)
    
    def test_activity_level_choices(self):
        """Test activity level field choices."""
        profile = UserProfile.objects.create(user=self.user)
        
        # Test valid choices
        for level, _ in UserProfile.ACTIVITY_LEVEL_CHOICES:
            profile.activity_level = level
            profile.full_clean()  # Should not raise
    
    def test_gender_choices(self):
        """Test gender field choices."""
        profile = UserProfile.objects.create(user=self.user)
        
        # Test valid choices
        for gender, _ in UserProfile.GENDER_CHOICES:
            profile.gender = gender
            profile.full_clean()  # Should not raise
    
    def test_measurement_system_choices(self):
        """Test measurement system field choices."""
        profile = UserProfile.objects.create(user=self.user)
        
        # Test valid choices
        for system, _ in UserProfile.MEASUREMENT_SYSTEM_CHOICES:
            profile.measurement_system = system
            profile.full_clean()  # Should not raise


class DietaryRestrictionModelTest(TestCase):
    """Test cases for the DietaryRestriction model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_create_dietary_restriction(self):
        """Test creating a dietary restriction."""
        restriction = DietaryRestriction.objects.create(
            user=self.user,
            name='Peanuts',
            restriction_type='allergy',
            severity='life_threatening',
            notes='Severe peanut allergy - carry EpiPen'
        )
        
        self.assertEqual(restriction.user, self.user)
        self.assertEqual(restriction.name, 'Peanuts')
        self.assertEqual(restriction.restriction_type, 'allergy')
        self.assertEqual(restriction.severity, 'life_threatening')
        self.assertTrue(restriction.is_active)  # default
    
    def test_unique_constraint(self):
        """Test unique constraint on user + name."""
        DietaryRestriction.objects.create(
            user=self.user,
            name='Gluten',
            restriction_type='intolerance'
        )
        
        # Try to create duplicate
        with self.assertRaises(IntegrityError):
            DietaryRestriction.objects.create(
                user=self.user,
                name='Gluten',  # Same name for same user
                restriction_type='allergy'
            )
    
    def test_string_representation(self):
        """Test string representation."""
        restriction = DietaryRestriction.objects.create(
            user=self.user,
            name='Dairy',
            restriction_type='intolerance'
        )
        
        expected = f"test@example.com - Dairy (Intolerance)"
        self.assertEqual(str(restriction), expected)
    
    def test_restriction_type_choices(self):
        """Test restriction type field choices."""
        restriction = DietaryRestriction.objects.create(
            user=self.user,
            name='Test'
        )
        
        # Test valid choices
        for r_type, _ in DietaryRestriction.RESTRICTION_TYPE_CHOICES:
            restriction.restriction_type = r_type
            restriction.full_clean()  # Should not raise
    
    def test_severity_choices(self):
        """Test severity field choices."""
        restriction = DietaryRestriction.objects.create(
            user=self.user,
            name='Test'
        )
        
        # Test valid choices
        severities = ['mild', 'moderate', 'severe', 'life_threatening']
        for severity in severities:
            restriction.severity = severity
            restriction.full_clean()  # Should not raise
    
    def test_multiple_restrictions_per_user(self):
        """Test that a user can have multiple restrictions."""
        restrictions = []
        for i, name in enumerate(['Peanuts', 'Gluten', 'Dairy']):
            restriction = DietaryRestriction.objects.create(
                user=self.user,
                name=name,
                restriction_type='allergy'
            )
            restrictions.append(restriction)
        
        self.assertEqual(self.user.dietary_restrictions.count(), 3)
        self.assertEqual(
            list(self.user.dietary_restrictions.all()), 
            restrictions
        )
    
    def test_optional_fields(self):
        """Test that optional fields can be blank."""
        restriction = DietaryRestriction.objects.create(
            user=self.user,
            name='Vegetarian',
            restriction_type='preference'
        )
        
        self.assertEqual(restriction.notes, '')
        self.assertEqual(restriction.severity, 'moderate')  # default
    
    def test_timestamps(self):
        """Test timestamp fields."""
        restriction = DietaryRestriction.objects.create(
            user=self.user,
            name='Test'
        )
        
        self.assertIsNotNone(restriction.created_at)
        self.assertIsNotNone(restriction.updated_at)
        self.assertIsInstance(restriction.created_at, datetime)
        self.assertIsInstance(restriction.updated_at, datetime)