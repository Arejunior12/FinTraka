from django.core.management.base import BaseCommand
from transactions.models import Category

class Command(BaseCommand):
    help = 'Create initial global categories'

    def handle(self, *args, **options):
        categories = [
            'Food & Dining', 'Shopping', 'Rent', 'Utilities', 'Transportation',
            'Entertainment', 'Healthcare', 'Salary', 'Freelance', 'Investments',
            'Education', 'Travel', 'Gifts', 'Other Income', 'Other Expense'
        ]

        for cat_name in categories:
            category, created = Category.objects.get_or_create(
                name=cat_name,
                defaults={'is_global': True, 'user': None}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created: {cat_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Already exists: {cat_name}'))

        self.stdout.write(self.style.SUCCESS('All categories created successfully!'))