import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartspend_backend.settings')
django.setup()

from transactions.models import Category

# Create initial global categories
global_categories = [
    'Food & Dining', 'Shopping', 'Rent', 'Utilities', 'Transportation',
    'Entertainment', 'Healthcare', 'Salary', 'Freelance', 'Investments',
    'Education', 'Travel', 'Gifts', 'Other Income', 'Other Expense'
]

for category_name in global_categories:
    Category.objects.get_or_create(
        name=category_name,
        is_global=True,
        user=None
    )
    print(f"Created category: {category_name}")

print("Initial data created successfully!")