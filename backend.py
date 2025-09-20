#!/usr/bin/env python3
"""
Digital Twin Backend - Complete Flask Application
This file contains the complete backend with all models, routes, and ML predictions.
"""

from flask import Flask, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
import json
import random
import uuid

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///digital_twin.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, origins=["*"], allow_headers=["Content-Type", "Authorization"])

# =============================================================================
# DATABASE MODELS
# =============================================================================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(50), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))
    height = db.Column(db.Float)
    weight = db.Column(db.Float)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.public_id,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'dateOfBirth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'height': self.height,
            'weight': self.weight,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class HealthMetric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    heart_rate = db.Column(db.Integer)
    blood_pressure_systolic = db.Column(db.Integer)
    blood_pressure_diastolic = db.Column(db.Integer)
    oxygen_saturation = db.Column(db.Float)
    stress_level = db.Column(db.Integer)
    sleep_duration = db.Column(db.Float)
    sleep_quality_score = db.Column(db.Integer)
    deep_sleep_duration = db.Column(db.Float)
    light_sleep_duration = db.Column(db.Float)
    rem_sleep_duration = db.Column(db.Float)
    steps_count = db.Column(db.Integer, default=0)
    calories_burned = db.Column(db.Integer, default=0)
    distance_traveled = db.Column(db.Float, default=0.0)
    active_minutes = db.Column(db.Integer, default=0)
    mood_rating = db.Column(db.Integer)
    water_intake = db.Column(db.Integer, default=0)
    screen_time = db.Column(db.Float, default=0.0)
    social_interactions = db.Column(db.Integer, default=0)
    measurement_timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    device_source = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_stress_level_text(self):
        if self.stress_level is None:
            return None
        levels = {1: "Very Low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very High"}
        return levels.get(self.stress_level, "Unknown")
    
    def to_dict(self):
        return {
            'id': self.id,
            'heartRate': self.heart_rate,
            'bloodPressure': {
                'systolic': self.blood_pressure_systolic,
                'diastolic': self.blood_pressure_diastolic
            } if self.blood_pressure_systolic else None,
            'oxygenSaturation': self.oxygen_saturation,
            'stressLevel': self.get_stress_level_text(),
            'sleepData': {
                'duration': self.sleep_duration,
                'qualityScore': self.sleep_quality_score,
                'deepSleep': self.deep_sleep_duration,
                'lightSleep': self.light_sleep_duration,
                'remSleep': self.rem_sleep_duration
            } if self.sleep_duration else None,
            'stepsCount': self.steps_count,
            'caloriesBurned': self.calories_burned,
            'distanceTraveled': self.distance_traveled,
            'activeMinutes': self.active_minutes,
            'moodRating': self.mood_rating,
            'waterIntake': self.water_intake,
            'screenTime': self.screen_time,
            'socialInteractions': self.social_interactions,
            'deviceSource': self.device_source,
            'timestamp': self.measurement_timestamp.isoformat(),
            'createdAt': self.created_at.isoformat()
        }

class AcademicData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    current_gpa = db.Column(db.Float)
    semester_gpa = db.Column(db.Float)
    daily_study_hours = db.Column(db.Float, default=0.0)
    weekly_study_hours = db.Column(db.Float, default=0.0)
    attendance_percentage = db.Column(db.Float, default=100.0)
    assignments_completed = db.Column(db.Integer, default=0)
    assignments_pending = db.Column(db.Integer, default=0)
    assignments_overdue = db.Column(db.Integer, default=0)
    average_assignment_score = db.Column(db.Float)
    exam_scores = db.Column(db.Text)
    courses_enrolled = db.Column(db.Text)
    target_gpa = db.Column(db.Float)
    academic_year = db.Column(db.String(20))
    semester = db.Column(db.String(20))
    recording_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'currentGPA': self.current_gpa,
            'semesterGPA': self.semester_gpa,
            'studyHours': {
                'daily': self.daily_study_hours,
                'weekly': self.weekly_study_hours
            },
            'attendance': {
                'percentage': self.attendance_percentage
            },
            'assignments': {
                'completed': self.assignments_completed,
                'pending': self.assignments_pending,
                'overdue': self.assignments_overdue,
                'averageScore': self.average_assignment_score
            },
            'examScores': json.loads(self.exam_scores) if self.exam_scores else [],
            'coursesEnrolled': json.loads(self.courses_enrolled) if self.courses_enrolled else [],
            'goals': {
                'targetGPA': self.target_gpa
            },
            'academicPeriod': {
                'year': self.academic_year,
                'semester': self.semester
            },
            'recordingDate': self.recording_date.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='medium')
    is_resolved = db.Column(db.Boolean, default=False)
    resolution_notes = db.Column(db.Text)
    resolved_at = db.Column(db.DateTime)
    source_metric = db.Column(db.String(100))
    threshold_value = db.Column(db.Float)
    actual_value = db.Column(db.Float)
    recommended_actions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.alert_type,
            'category': self.category,
            'title': self.title,
            'message': self.message,
            'priority': self.priority,
            'isResolved': self.is_resolved,
            'resolutionNotes': self.resolution_notes,
            'resolvedAt': self.resolved_at.isoformat() if self.resolved_at else None,
            'sourceMetric': self.source_metric,
            'thresholdValue': self.threshold_value,
            'actualValue': self.actual_value,
            'recommendedActions': json.loads(self.recommended_actions) if self.recommended_actions else [],
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class Device(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    device_name = db.Column(db.String(100), nullable=False)
    device_type = db.Column(db.String(50), nullable=False)
    device_model = db.Column(db.String(100))
    device_id = db.Column(db.String(200), unique=True, nullable=False)
    is_connected = db.Column(db.Boolean, default=False)
    connection_status = db.Column(db.String(50), default='disconnected')
    last_sync_time = db.Column(db.DateTime)
    battery_level = db.Column(db.Integer)
    supported_metrics = db.Column(db.Text)
    device_settings = db.Column(db.Text)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.device_name,
            'type': self.device_type,
            'model': self.device_model,
            'status': self.connection_status,
            'isConnected': self.is_connected,
            'lastSync': self.last_sync_time.isoformat() if self.last_sync_time else None,
            'battery': self.battery_level,
            'supportedMetrics': json.loads(self.supported_metrics) if self.supported_metrics else [],
            'registeredAt': self.registered_at.isoformat(),
            'lastUpdated': self.last_updated.isoformat()
        }

# =============================================================================
# ML PREDICTION ENGINE
# =============================================================================

class MLPredictionEngine:
    def predict_burnout_risk(self, user_data):
        stress_factor = user_data.get('avg_stress_level', 2) / 5.0
        sleep_factor = max(0, (8 - user_data.get('avg_sleep_duration', 7)) / 8)
        study_factor = min(1, user_data.get('daily_study_hours', 4) / 10)
        gpa_factor = max(0, (4.0 - user_data.get('current_gpa', 3.5)) / 4.0)
        
        risk_score = (stress_factor * 0.3 + sleep_factor * 0.3 + 
                     study_factor * 0.2 + gpa_factor * 0.2) * 100
        
        return {
            'risk_percentage': min(100, max(0, int(risk_score))),
            'confidence': 0.85,
            'risk_level': self._get_risk_level(risk_score),
            'factors': {
                'stress_level': stress_factor,
                'sleep_quality': sleep_factor,
                'study_load': study_factor,
                'academic_pressure': gpa_factor
            }
        }
    
    def predict_academic_performance(self, user_data):
        current_gpa = user_data.get('current_gpa', 3.0)
        attendance = user_data.get('attendance_percentage', 90) / 100
        study_hours = user_data.get('daily_study_hours', 4)
        sleep_quality = user_data.get('avg_sleep_quality', 80) / 100
        stress_level = user_data.get('avg_stress_level', 2)
        
        study_factor = min(1, study_hours / 6)
        health_factor = (sleep_quality * 0.6 + (1 - stress_level/5) * 0.4)
        
        predicted_gpa = (current_gpa * 0.4 + attendance * 0.2 + 
                        study_factor * 4 * 0.2 + health_factor * 4 * 0.2)
        
        trend = 'improving' if predicted_gpa > current_gpa else 'declining' if predicted_gpa < current_gpa else 'stable'
        
        return {
            'predicted_gpa': round(min(4.0, max(0.0, predicted_gpa)), 2),
            'performance_trend': trend,
            'confidence': 0.82
        }
    
    def predict_health_trend(self, user_data):
        heart_rate = user_data.get('avg_heart_rate', 75)
        sleep_quality = user_data.get('avg_sleep_quality', 80)
        stress_level = user_data.get('avg_stress_level', 2)
        activity_level = user_data.get('avg_steps', 8000)
        
        health_score = 0
        
        if 60 <= heart_rate <= 100:
            health_score += 25
        if sleep_quality >= 80:
            health_score += 30
        elif sleep_quality >= 70:
            health_score += 20
        if stress_level <= 2:
            health_score += 25
        elif stress_level <= 3:
            health_score += 15
        if activity_level >= 8000:
            health_score += 20
        
        trend = 'improving' if health_score >= 80 else 'stable' if health_score >= 60 else 'declining'
        
        return {
            'trend': trend,
            'health_score': health_score,
            'confidence': 0.78
        }
    
    def generate_recommendations(self, user_data, predictions):
        recommendations = []
        
        if predictions.get('burnout_risk', {}).get('risk_percentage', 0) > 60:
            recommendations.extend([
                "Consider reducing study hours and taking more breaks",
                "Practice stress management techniques like meditation",
                "Ensure you get 7-8 hours of quality sleep"
            ])
        
        sleep_duration = user_data.get('avg_sleep_duration', 7)
        if sleep_duration < 7:
            recommendations.append("Increase sleep duration by 30-60 minutes")
        
        study_hours = user_data.get('daily_study_hours', 4)
        if study_hours > 8:
            recommendations.append("Take study breaks every 90 minutes to improve focus")
        
        steps = user_data.get('avg_steps', 8000)
        if steps < 8000:
            recommendations.append("Increase daily physical activity to 8,000+ steps")
        
        stress_level = user_data.get('avg_stress_level', 2)
        if stress_level >= 3:
            recommendations.extend([
                "Consider stress management techniques",
                "Maintain regular exercise routine"
            ])
        
        return recommendations[:6] if recommendations else [
            "Maintain regular sleep schedule",
            "Take breaks during study sessions",
            "Stay physically active"
        ]
    
    def _get_risk_level(self, risk_score):
        if risk_score < 30:
            return "Low"
        elif risk_score < 60:
            return "Medium"
        else:
            return "High"

# Initialize ML engine
ml_engine = MLPredictionEngine()

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_current_user():
    try:
        user_id = get_jwt_identity()
        return User.query.filter_by(public_id=user_id, is_active=True).first()
    except:
        return None

def calculate_health_status(health_data):
    if not health_data:
        return "No Data"
    
    score = 100
    
    hr = health_data.get('heart_rate')
    if hr:
        if hr < 60 or hr > 100:
            score -= 15
        elif hr > 90:
            score -= 5
    
    bp_sys = health_data.get('blood_pressure_systolic')
    bp_dia = health_data.get('blood_pressure_diastolic')
    if bp_sys and bp_dia:
        if bp_sys > 140 or bp_dia > 90:
            score -= 20
        elif bp_sys > 130 or bp_dia > 80:
            score -= 10
    
    spo2 = health_data.get('oxygen_saturation')
    if spo2 and spo2 < 95:
        score -= 25
    elif spo2 and spo2 < 98:
        score -= 10
    
    sleep_quality = health_data.get('sleep_quality_score')
    if sleep_quality:
        if sleep_quality < 60:
            score -= 20
        elif sleep_quality < 80:
            score -= 10
    
    stress = health_data.get('stress_level')
    if stress:
        if stress >= 4:
            score -= 15
        elif stress >= 3:
            score -= 8
    
    if score >= 90:
        return "Excellent"
    elif score >= 75:
        return "Good"
    elif score >= 60:
        return "Fair"
    else:
        return "Poor"

def get_user_aggregated_data(user_id, days=30):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    health_metrics = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.measurement_timestamp >= start_date
    ).all()
    
    academic_data = AcademicData.query.filter_by(user_id=user_id).order_by(
        AcademicData.created_at.desc()
    ).first()
    
    if not health_metrics and not academic_data:
        return get_default_user_data()
    
    health_data = {}
    if health_metrics:
        health_data = {
            'avg_heart_rate': sum(h.heart_rate for h in health_metrics if h.heart_rate) / len([h for h in health_metrics if h.heart_rate]) if any(h.heart_rate for h in health_metrics) else 75,
            'avg_sleep_duration': sum(h.sleep_duration for h in health_metrics if h.sleep_duration) / len([h for h in health_metrics if h.sleep_duration]) if any(h.sleep_duration for h in health_metrics) else 7,
            'avg_sleep_quality': sum(h.sleep_quality_score for h in health_metrics if h.sleep_quality_score) / len([h for h in health_metrics if h.sleep_quality_score]) if any(h.sleep_quality_score for h in health_metrics) else 80,
            'avg_stress_level': sum(h.stress_level for h in health_metrics if h.stress_level) / len([h for h in health_metrics if h.stress_level]) if any(h.stress_level for h in health_metrics) else 2,
            'avg_steps': sum(h.steps_count for h in health_metrics if h.steps_count) / len([h for h in health_metrics if h.steps_count]) if any(h.steps_count for h in health_metrics) else 8000,
        }
    
    academic_info = {}
    if academic_data:
        academic_info = {
            'current_gpa': academic_data.current_gpa or 3.0,
            'daily_study_hours': academic_data.daily_study_hours or 4.0,
            'attendance_percentage': academic_data.attendance_percentage or 90.0,
            'assignments_pending': academic_data.assignments_pending or 2,
            'assignments_completed': academic_data.assignments_completed or 10
        }
    
    return {**health_data, **academic_info}

def get_default_user_data():
    return {
        'avg_heart_rate': 75,
        'avg_sleep_duration': 7,
        'avg_sleep_quality': 80,
        'avg_stress_level': 2,
        'avg_steps': 8000,
        'current_gpa': 3.0,
        'daily_study_hours': 4.0,
        'attendance_percentage': 90.0,
        'assignments_pending': 2,
        'assignments_completed': 10
    }

def create_sample_data(user_id):
    # Create sample health metrics for the past 7 days
    for i in range(7):
        date = datetime.utcnow() - timedelta(days=i)
        
        health_metric = HealthMetric(
            user_id=user_id,
            heart_rate=random.randint(65, 95),
            blood_pressure_systolic=random.randint(110, 130),
            blood_pressure_diastolic=random.randint(70, 85),
            oxygen_saturation=random.randint(96, 100),
            stress_level=random.randint(1, 3),
            sleep_duration=random.uniform(6.5, 8.5),
            sleep_quality_score=random.randint(70, 95),
            deep_sleep_duration=random.uniform(1.5, 2.5),
            light_sleep_duration=random.uniform(3.5, 4.5),
            rem_sleep_duration=random.uniform(1.0, 1.5),
            steps_count=random.randint(6000, 12000),
            calories_burned=random.randint(1800, 2500),
            active_minutes=random.randint(30, 90),
            mood_rating=random.randint(6, 9),
            water_intake=random.randint(4, 8),
            screen_time=random.uniform(3.0, 6.0),
            social_interactions=random.randint(3, 10),
            measurement_timestamp=date
        )
        db.session.add(health_metric)
    
    # Create sample academic data
    academic_data = AcademicData(
        user_id=user_id,
        current_gpa=random.uniform(3.0, 3.8),
        semester_gpa=random.uniform(3.2, 3.9),
        daily_study_hours=random.uniform(3.0, 6.0),
        weekly_study_hours=random.uniform(20.0, 35.0),
        attendance_percentage=random.uniform(85.0, 98.0),
        assignments_completed=random.randint(8, 15),
        assignments_pending=random.randint(2, 5),
        assignments_overdue=random.randint(0, 2),
        average_assignment_score=random.uniform(75.0, 95.0),
        target_gpa=3.8,
        academic_year="2024-2025",
        semester="Fall 2024"
    )
    db.session.add(academic_data)
    
    # Create sample alerts
    sample_alerts = [
        {
            'type': 'warning',
            'category': 'warning',
            'title': 'Sleep Pattern Alert',
            'message': 'Your sleep duration has been below recommended levels for 3 consecutive days',
            'priority': 'medium',
            'source_metric': 'sleep_duration'
        },
        {
            'type': 'info',
            'category': 'info',
            'title': 'Study Recommendation',
            'message': 'Based on your energy patterns, optimal study time is between 9-11 AM',
            'priority': 'low',
            'source_metric': 'energy_pattern'
        },
        {
            'type': 'success',
            'category': 'success',
            'title': 'Health Goal Achieved',
            'message': 'Congratulations! You\'ve maintained healthy stress levels for 5 days',
            'priority': 'low',
            'source_metric': 'stress_level'
        }
    ]
    
    for alert_data in sample_alerts:
        alert = Alert(
            user_id=user_id,
            alert_type=alert_data['type'],
            category=alert_data['category'],
            title=alert_data['title'],
            message=alert_data['message'],
            priority=alert_data['priority'],
            source_metric=alert_data['source_metric'],
            is_resolved=alert_data.get('resolved', False)
        )
        db.session.add(alert)
    
    # Create sample devices
    devices = [
        {
            'name': 'Apple Watch Series 9',
            'type': 'smartwatch',
            'model': 'Series 9',
            'status': 'connected',
            'battery': random.randint(60, 90)
        },
        {
            'name': 'Fitbit Charge 5',
            'type': 'fitness_tracker',
            'model': 'Charge 5',
            'status': 'connected',
            'battery': random.randint(40, 70)
        },
        {
            'name': 'Sleep Tracker',
            'type': 'sleep_monitor',
            'model': 'Pro',
            'status': 'disconnected',
            'battery': None
        }
    ]
    
    for device_data in devices:
        device = Device(
            user_id=user_id,
            device_name=device_data['name'],
            device_type=device_data['type'],
            device_model=device_data['model'],
            device_id=f"{device_data['type']}_{uuid.uuid4().hex[:8]}",
            connection_status=device_data['status'],
            is_connected=device_data['status'] == 'connected',
            battery_level=device_data['battery'],
            last_sync_time=datetime.utcnow() if device_data['status'] == 'connected' else None
        )
        db.session.add(device)
    
    db.session.commit()

# =============================================================================
# API ROUTES
# =============================================================================

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['email', 'password', 'firstName', 'lastName']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].strip().lower()
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 409
        
        user = User(
            email=email,
            first_name=data['firstName'].strip(),
            last_name=data['lastName'].strip(),
            gender=data.get('gender'),
            height=float(data['height']) if data.get('height') else None,
            weight=float(data['weight']) if data.get('weight') else None
        )
        
        if data.get('dateOfBirth'):
            user.date_of_birth = datetime.strptime(data['dateOfBirth'], '%Y-%m-%d').date()
        
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        
        create_sample_data(user.id)
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'userId': user.public_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=email, is_active=True).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        access_token = create_access_token(identity=user.public_id)
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 500

# Health Data Routes
@app.route('/api/health/current', methods=['GET'])
@jwt_required()
def get_current_health():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        
        latest_metric = HealthMetric.query.filter(
            HealthMetric.user_id == user.id,
            HealthMetric.measurement_timestamp >= twenty_four_hours_ago
        ).order_by(HealthMetric.measurement_timestamp.desc()).first()
        
        if not latest_metric:
            return jsonify({
                'success': True,
                'data': {
                    'heartRate': 78,
                    'bloodPressure': {'systolic': 118, 'diastolic': 76},
                    'oxygenSaturation': 98,
                    'stressLevel': 'Low',
                    'sleepQuality': 85,
                    'healthStatus': 'Excellent',
                    'stepsCount': 8247,
                    'caloriesBurned': 2156,
                    'activeMinutes': 45,
                    'lastUpdated': datetime.utcnow().isoformat()
                }
            }), 200
        
        health_status = calculate_health_status({
            'heart_rate': latest_metric.heart_rate,
            'blood_pressure_systolic': latest_metric.blood_pressure_systolic,
            'blood_pressure_diastolic': latest_metric.blood_pressure_diastolic,
            'oxygen_saturation': latest_metric.oxygen_saturation,
            'sleep_quality_score': latest_metric.sleep_quality_score,
            'stress_level': latest_metric.stress_level
        })
        
        return jsonify({
            'success': True,
            'data': {
                'heartRate': latest_metric.heart_rate,
                'bloodPressure': {
                    'systolic': latest_metric.blood_pressure_systolic,
                    'diastolic': latest_metric.blood_pressure_diastolic
                } if latest_metric.blood_pressure_systolic else None,
                'oxygenSaturation': latest_metric.oxygen_saturation,
                'stressLevel': latest_metric.get_stress_level_text(),
                'sleepQuality': latest_metric.sleep_quality_score,
                'healthStatus': health_status,
                'stepsCount': latest_metric.steps_count,
                'caloriesBurned': latest_metric.calories_burned,
                'activeMinutes': latest_metric.active_minutes,
                'lastUpdated': latest_metric.measurement_timestamp.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch health data: {str(e)}'}), 500

@app.route('/api/health/history', methods=['GET'])
@jwt_required()
def get_health_history():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        days = int(request.args.get('days', 7))
        metric_type = request.args.get('metric', 'all')
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        health_data = HealthMetric.query.filter(
            HealthMetric.user_id == user.id,
            HealthMetric.measurement_timestamp >= start_date
        ).order_by(HealthMetric.measurement_timestamp.asc()).all()
        
        if metric_type == 'heart_rate':
            data = [{
                'date': h.measurement_timestamp.strftime('%Y-%m-%d'),
                'time': h.measurement_timestamp.strftime('%H:%M'),
                'value': h.heart_rate,
                'timestamp': h.measurement_timestamp.isoformat()
            } for h in health_data if h.heart_rate]
        
        elif metric_type == 'sleep':
            data = [{
                'date': h.measurement_timestamp.strftime('%Y-%m-%d'),
                'totalSleep': h.sleep_duration,
                'deepSleep': h.deep_sleep_duration,
                'lightSleep': h.light_sleep_duration,
                'remSleep': h.rem_sleep_duration,
                'quality': h.sleep_quality_score
            } for h in health_data if h.sleep_duration]
        
        elif metric_type == 'stress':
            data = [{
                'date': h.measurement_timestamp.strftime('%Y-%m-%d'),
                'level': h.stress_level,
                'timestamp': h.measurement_timestamp.isoformat()
            } for h in health_data if h.stress_level]
        
        else:
            data = [h.to_dict() for h in health_data]
        
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data),
            'period': {'days': days, 'metric': metric_type}
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch health history: {str(e)}'}), 500

@app.route('/api/health/submit', methods=['POST'])
@jwt_required()
def submit_health_data():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        health_metric = HealthMetric(
            user_id=user.id,
            measurement_timestamp=datetime.utcnow()
        )
        
        # Update fields from data
        if 'heartRate' in data:
            health_metric.heart_rate = int(data['heartRate'])
        if 'bloodPressure' in data:
            bp = data['bloodPressure']
            health_metric.blood_pressure_systolic = int(bp.get('systolic', 0)) if bp.get('systolic') else None
            health_metric.blood_pressure_diastolic = int(bp.get('diastolic', 0)) if bp.get('diastolic') else None
        if 'oxygenSaturation' in data:
            health_metric.oxygen_saturation = float(data['oxygenSaturation'])
        if 'stressLevel' in data:
            health_metric.stress_level = int(data['stressLevel'])
        if 'sleepDuration' in data:
            health_metric.sleep_duration = float(data['sleepDuration'])
        if 'sleepQuality' in data:
            health_metric.sleep_quality_score = int(data['sleepQuality'])
        if 'stepsCount' in data:
            health_metric.steps_count = int(data['stepsCount'])
        if 'caloriesBurned' in data:
            health_metric.calories_burned = int(data['caloriesBurned'])
        if 'waterIntake' in data:
            health_metric.water_intake = int(data['waterIntake'])
        if 'screenTime' in data:
            health_metric.screen_time = float(data['screenTime'])
        if 'moodRating' in data:
            health_metric.mood_rating = int(data['moodRating'])
        if 'socialInteractions' in data:
            health_metric.social_interactions = int(data['socialInteractions'])
        
        db.session.add(health_metric)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Health data saved successfully',
            'id': health_metric.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to save health data: {str(e)}'}), 500

# Academic Data Routes
@app.route('/api/academic/performance', methods=['GET'])
@jwt_required()
def get_academic_performance():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        academic_data = AcademicData.query.filter_by(user_id=user.id).order_by(
            AcademicData.created_at.desc()
        ).first()
        
        if not academic_data:
            return jsonify({
                'success': True,
                'data': {
                    'currentGPA': 3.67,
                    'studyHours': {'daily': 4.5, 'weekly': 28, 'recommended': 35},
                    'attendance': {'percentage': 94},
                    'assignments': {'completed': 12, 'pending': 3, 'overdue': 1},
                    'upcomingExams': [
                        {'subject': 'Data Structures', 'date': '2025-09-25', 'difficulty': 'High'},
                        {'subject': 'Statistics', 'date': '2025-09-28', 'difficulty': 'Medium'},
                        {'subject': 'Ethics', 'date': '2025-10-02', 'difficulty': 'Low'}
                    ]
                }
            }), 200
        
        return jsonify({
            'success': True,
            'data': academic_data.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch academic data: {str(e)}'}), 500

@app.route('/api/academic/submit', methods=['POST'])
@jwt_required()
def submit_academic_data():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        academic_data = AcademicData.query.filter_by(user_id=user.id).first()
        if not academic_data:
            academic_data = AcademicData(user_id=user.id)
        
        if 'currentGPA' in data:
            academic_data.current_gpa = float(data['currentGPA'])
        if 'dailyStudyHours' in data:
            academic_data.daily_study_hours = float(data['dailyStudyHours'])
        if 'weeklyStudyHours' in data:
            academic_data.weekly_study_hours = float(data['weeklyStudyHours'])
        if 'attendancePercentage' in data:
            academic_data.attendance_percentage = float(data['attendancePercentage'])
        if 'assignmentsCompleted' in data:
            academic_data.assignments_completed = int(data['assignmentsCompleted'])
        if 'assignmentsPending' in data:
            academic_data.assignments_pending = int(data['assignmentsPending'])
        if 'assignmentsOverdue' in data:
            academic_data.assignments_overdue = int(data['assignmentsOverdue'])
        
        academic_data.updated_at = datetime.utcnow()
        
        if academic_data.id is None:
            db.session.add(academic_data)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Academic data saved successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to save academic data: {str(e)}'}), 500

# ML Predictions Routes
@app.route('/api/predictions', methods=['GET'])
@jwt_required()
def get_predictions():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = get_user_aggregated_data(user.id)
        
        burnout_risk = ml_engine.predict_burnout_risk(user_data)
        academic_performance = ml_engine.predict_academic_performance(user_data)
        health_trend = ml_engine.predict_health_trend(user_data)
        
        predictions = {
            'burnoutRisk': burnout_risk['risk_percentage'],
            'academicPerformance': academic_performance['predicted_gpa'],
            'healthTrend': health_trend['trend']
        }
        
        recommendations = ml_engine.generate_recommendations(user_data, predictions)
        
        return jsonify({
            'success': True,
            'predictions': {
                'burnoutRisk': burnout_risk,
                'academicPerformance': academic_performance,
                'healthTrend': health_trend
            },
            'recommendations': recommendations,
            'generatedAt': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate predictions: {str(e)}'}), 500

# Alerts Routes
@app.route('/api/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        show_resolved = request.args.get('resolved', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 50))
        
        query = Alert.query.filter(Alert.user_id == user.id)
        
        if not show_resolved:
            query = query.filter(Alert.is_resolved == False)
        
        alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'alerts': [alert.to_dict() for alert in alerts],
            'count': len(alerts)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch alerts: {str(e)}'}), 500

@app.route('/api/alerts/<int:alert_id>/resolve', methods=['PUT'])
@jwt_required()
def resolve_alert(alert_id):
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        alert = Alert.query.filter_by(id=alert_id, user_id=user.id).first()
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        alert.is_resolved = True
        alert.resolved_at = datetime.utcnow()
        alert.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alert resolved successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to resolve alert: {str(e)}'}), 500

# Device Routes
@app.route('/api/devices', methods=['GET'])
@jwt_required()
def get_devices():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        devices = Device.query.filter_by(user_id=user.id).all()
        
        return jsonify({
            'success': True,
            'devices': [device.to_dict() for device in devices]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch devices: {str(e)}'}), 500

# Goals and Progress Routes
@app.route('/api/goals', methods=['GET'])
@jwt_required()
def get_goals():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        recent_health = HealthMetric.query.filter_by(user_id=user.id).order_by(
            HealthMetric.measurement_timestamp.desc()
        ).first()
        
        goals = {
            'sleep': {
                'target': 8.0,
                'current': recent_health.sleep_duration if recent_health and recent_health.sleep_duration else 7.2,
                'progress': 90
            },
            'steps': {
                'target': 10000,
                'current': recent_health.steps_count if recent_health else 8247,
                'progress': 82
            },
            'study': {
                'target': 6.0,
                'current': 4.5,
                'progress': 75
            },
            'stress': {
                'target': 2,
                'current': recent_health.stress_level if recent_health else 1,
                'progress': 100
            }
        }
        
        for goal_name, goal_data in goals.items():
            if goal_name == 'stress':
                progress = max(0, (goal_data['target'] - goal_data['current'] + 1) / goal_data['target'] * 100)
            else:
                progress = min(100, goal_data['current'] / goal_data['target'] * 100)
            goals[goal_name]['progress'] = round(progress)
        
        return jsonify({
            'success': True,
            'goals': goals
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch goals: {str(e)}'}), 500

# Lifestyle data route
@app.route('/api/lifestyle', methods=['GET'])
@jwt_required()
def get_lifestyle_data():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        recent_health = HealthMetric.query.filter_by(user_id=user.id).order_by(
            HealthMetric.measurement_timestamp.desc()
        ).first()
        
        lifestyle_data = {
            'dailySteps': recent_health.steps_count if recent_health else 8247,
            'caloriesBurned': recent_health.calories_burned if recent_health else 2156,
            'waterIntake': recent_health.water_intake if recent_health else 6,
            'screenTime': recent_health.screen_time if recent_health else 5.2,
            'socialInteractions': recent_health.social_interactions if recent_health else 7,
            'moodRating': recent_health.mood_rating if recent_health else 7,
            'activeMinutes': recent_health.active_minutes if recent_health else 45
        }
        
        return jsonify({
            'success': True,
            'data': lifestyle_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch lifestyle data: {str(e)}'}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'digital-twin-backend',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# Serve frontend files
@app.route('/')
def serve_frontend():
    # Serve the index.html file from your frontend
    with open('index.html', 'r') as f:
        content = f.read()
    return content

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# =============================================================================
# APPLICATION STARTUP
# =============================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Create a demo user if none exists
        if not User.query.first():
            demo_user = User(
                email='demo@student.com',
                first_name='Demo',
                last_name='Student',
                gender='Other',
                height=170.0,
                weight=70.0
            )
            demo_user.set_password('demo123')
            db.session.add(demo_user)
            db.session.commit()
            
            # Create sample data for demo user
            create_sample_data(demo_user.id)
            print("✅ Demo user created: demo@student.com / demo123")
    
    print("🚀 Starting Digital Twin Backend Server...")
    print("📊 Dashboard will be available at: http://localhost:5000")
    print("🔑 Demo login: demo@student.com / demo123")
    print("📖 API documentation: http://localhost:5000/health")
    
    app.run(host='0.0.0.0', port=5000, debug=True)