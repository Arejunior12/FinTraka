from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Sum, Q
from datetime import datetime
from transactions.models import Transaction, Category
from .serializers import UserSerializer, TransactionSerializer, CategorySerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'user': UserSerializer(user, context=self.get_serializer_context()).data,
                'message': 'User created successfully'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(
            Q(is_global=True) | Q(user=self.request.user)
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.filter(user=user)
        
        # Filtering options
        type_filter = self.request.query_params.get('type')
        category_filter = self.request.query_params.get('category')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        if category_filter:
            queryset = queryset.filter(category_id=category_filter)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
            
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        user = request.user
        today = datetime.now().date()
        first_day_of_month = today.replace(day=1)
        
        # Current month transactions
        monthly_transactions = Transaction.objects.filter(
            user=user,
            date__gte=first_day_of_month,
            date__lte=today
        )
        
        total_income = monthly_transactions.filter(type='INCOME').aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        
        total_expenses = monthly_transactions.filter(type='EXPENSE').aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        
        # All-time balance
        all_income = Transaction.objects.filter(user=user, type='INCOME').aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        
        all_expenses = Transaction.objects.filter(user=user, type='EXPENSE').aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        
        total_balance = all_income - all_expenses
        
        return Response({
            'total_balance': float(total_balance),
            'monthly_income': float(total_income),
            'monthly_expenses': float(total_expenses),
            'monthly_balance': float(total_income - total_expenses)
        })

    @action(detail=False, methods=['get'])
    def spending_by_category(self, request):
        user = request.user
        today = datetime.now().date()
        first_day_of_month = today.replace(day=1)
        
        spending_data = Transaction.objects.filter(
            user=user,
            type='EXPENSE',
            date__gte=first_day_of_month,
            date__lte=today,
            category__isnull=False
        ).values('category__name').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        return Response(list(spending_data))