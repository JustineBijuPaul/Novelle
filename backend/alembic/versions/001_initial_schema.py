"""Initial schema — create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-03-11

Creates all 9 PostgreSQL tables from ORM models:
    hospitals, users, pregnancy_profiles, health_logs,
    mental_health_assessments, risk_scores, doctors,
    escalations, reminders
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ──────────────────────────────────────────────
    user_role = postgresql.ENUM(
        'pregnant_user', 'postpartum_user', 'doctor',
        'hospital_admin', 'platform_admin',
        name='user_role'
    )
    user_role.create(op.get_bind(), checkfirst=True)

    # ── 1. hospitals ───────────────────────────────────────
    op.create_table('hospitals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.String(500)),
        sa.Column('city', sa.String(100)),
        sa.Column('state', sa.String(100)),
        sa.Column('pincode', sa.String(10)),
        sa.Column('location_lat', sa.Float()),
        sa.Column('location_lng', sa.Float()),
        sa.Column('phone', sa.String(50)),
        sa.Column('has_obgyn', sa.Boolean(), default=False),
        sa.Column('has_nicu', sa.Boolean(), default=False),
        sa.Column('is_emergency_capable', sa.Boolean(), default=False),
        sa.Column('is_24x7', sa.Boolean(), default=False),
        sa.Column('hospital_type', sa.String(50), default='general'),
        sa.Column('specialties', postgresql.JSONB(), default=[]),
        sa.Column('rating', sa.Float()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_hospitals_city', 'hospitals', ['city'])
    op.create_index('idx_hospitals_state', 'hospitals', ['state'])

    # ── 2. users ───────────────────────────────────────────
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20)),
        sa.Column('role', sa.Enum('pregnant_user', 'postpartum_user', 'doctor',
                                  'hospital_admin', 'platform_admin', name='user_role'),
                  nullable=False, server_default='pregnant_user'),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('avatar_url', sa.String(512)),
        sa.Column('city', sa.String(100)),
        sa.Column('state', sa.String(100)),
        sa.Column('country', sa.String(100), server_default='India'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])

    # ── 3. pregnancy_profiles ──────────────────────────────
    op.create_table('pregnancy_profiles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'),
                  unique=True, nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('height_cm', sa.Float()),
        sa.Column('weight_kg', sa.Float()),
        sa.Column('bmi', sa.Float()),
        sa.Column('pregnancy_week', sa.Integer(), default=1),
        sa.Column('trimester', sa.String(20), default='first'),
        sa.Column('due_date', sa.DateTime()),
        sa.Column('last_menstrual_period', sa.DateTime()),
        sa.Column('blood_group', sa.String(10)),
        sa.Column('previous_pregnancies', sa.Integer(), default=0),
        sa.Column('pregnancy_history', postgresql.JSONB(), default=[]),
        sa.Column('lifestyle_indicators', postgresql.JSONB(), default=[]),
        sa.Column('hemoglobin_level', sa.Float()),
        sa.Column('gestational_diabetes', sa.Boolean(), default=False),
        sa.Column('thyroid_disorder', sa.String(30), default='none'),
        sa.Column('past_complications', postgresql.JSONB(), default=[]),
        sa.Column('chronic_hypertension', sa.Boolean(), default=False),
        sa.Column('profile_completion_score', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_profiles_user_id', 'pregnancy_profiles', ['user_id'])

    # ── 4. health_logs ─────────────────────────────────────
    op.create_table('health_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('log_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('bp_systolic', sa.Integer()),
        sa.Column('bp_diastolic', sa.Integer()),
        sa.Column('blood_sugar_fasting', sa.Float()),
        sa.Column('blood_sugar_postmeal', sa.Float()),
        sa.Column('weight_kg', sa.Float()),
        sa.Column('sleep_quality', sa.Integer()),
        sa.Column('pain_score', sa.Integer(), default=0),
        sa.Column('pain_location', sa.String(100)),
        sa.Column('nausea_count', sa.Integer(), default=0),
        sa.Column('nausea_severity', sa.Integer(), default=0),
        sa.Column('dizziness', sa.Boolean(), default=False),
        sa.Column('edema_flag', sa.Boolean(), default=False),
        sa.Column('edema_location', sa.String(100)),
        sa.Column('bleeding_flag', sa.Boolean(), default=False),
        sa.Column('bleeding_severity', sa.String(20)),
        sa.Column('cramps_flag', sa.Boolean(), default=False),
        sa.Column('cramps_intensity', sa.Integer(), default=0),
        sa.Column('fetal_movement_count', sa.Integer()),
        sa.Column('appetite_score', sa.Integer()),
        sa.Column('hydration_ml', sa.Integer()),
        sa.Column('pregnancy_week', sa.Integer()),
        sa.Column('notes', sa.String(1000)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_health_logs_user_date', 'health_logs', ['user_id', 'log_date'])

    # ── 5. mental_health_assessments ──────────────────────
    op.create_table('mental_health_assessments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assessment_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('phq9_score', sa.Integer()),
        sa.Column('gad7_score', sa.Integer()),
        sa.Column('epds_score', sa.Integer()),
        sa.Column('mood_score', sa.Integer()),
        sa.Column('mood_emoji', sa.String(10)),
        sa.Column('stress_level', sa.Integer()),
        sa.Column('stress_reason', sa.String(500)),
        sa.Column('social_support_score', sa.Integer()),
        sa.Column('assessment_type', sa.String(30), default='daily'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_mental_user_date', 'mental_health_assessments', ['user_id', 'assessment_date'])

    # ── 6. risk_scores ─────────────────────────────────────
    op.create_table('risk_scores',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scored_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('mental_risk_level', sa.String(10)),
        sa.Column('mental_confidence', sa.Float()),
        sa.Column('depression_risk', sa.String(10)),
        sa.Column('anxiety_risk', sa.String(10)),
        sa.Column('isolation_detected', sa.Boolean(), default=False),
        sa.Column('postpartum_risk', sa.String(10)),
        sa.Column('physical_risk_level', sa.String(10)),
        sa.Column('physical_confidence', sa.Float()),
        sa.Column('diabetes_risk', sa.String(10)),
        sa.Column('hypertension_risk', sa.String(10)),
        sa.Column('anemia_risk', sa.String(10)),
        sa.Column('infection_risk', sa.String(10)),
        sa.Column('nutrition_risk', sa.String(10)),
        sa.Column('fetal_risk_level', sa.String(10)),
        sa.Column('fetal_confidence', sa.Float()),
        sa.Column('preterm_risk', sa.String(10)),
        sa.Column('low_birth_weight_risk', sa.String(10)),
        sa.Column('growth_abnormality_risk', sa.String(10)),
        sa.Column('missed_care_risk', sa.String(10)),
        sa.Column('shap_features_json', postgresql.JSONB()),
        sa.Column('flagged_for_escalation', sa.Boolean(), default=False),
        sa.Column('crisis_flag', sa.String(20), default='SAFE'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_risk_user_id', 'risk_scores', ['user_id'])
    op.create_index('idx_risk_scored_at', 'risk_scores', ['scored_at'])

    # ── 7. doctors ─────────────────────────────────────────
    op.create_table('doctors',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('specialty', sa.String(100), default='OB-GYN'),
        sa.Column('hospital_id', sa.Integer(), sa.ForeignKey('hospitals.id', ondelete='SET NULL')),
        sa.Column('contact', sa.String(50)),
        sa.Column('email', sa.String(255)),
        sa.Column('license_number', sa.String(100)),
        sa.Column('available_for_escalation', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )

    # ── 8. escalations ─────────────────────────────────────
    op.create_table('escalations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('risk_type', sa.String(30), nullable=False),
        sa.Column('risk_level', sa.String(10), nullable=False),
        sa.Column('severity', sa.String(20)),
        sa.Column('escalation_reason', sa.Text()),
        sa.Column('assigned_doctor_id', sa.Integer(), sa.ForeignKey('doctors.id', ondelete='SET NULL')),
        sa.Column('status', sa.String(30), default='pending'),
        sa.Column('doctor_notes', sa.Text()),
        sa.Column('resolved_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_escalations_status', 'escalations', ['status'])

    # ── 9. reminders ───────────────────────────────────────
    op.create_table('reminders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reminder_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.String(500)),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('recurring', sa.Boolean(), default=False),
        sa.Column('recurrence_pattern', sa.String(30)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_completed', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_reminders_user_scheduled', 'reminders', ['user_id', 'scheduled_at'])


def downgrade() -> None:
    op.drop_table('reminders')
    op.drop_table('escalations')
    op.drop_table('doctors')
    op.drop_table('risk_scores')
    op.drop_table('mental_health_assessments')
    op.drop_table('health_logs')
    op.drop_table('pregnancy_profiles')
    op.drop_table('users')
    op.drop_table('hospitals')
    op.execute("DROP TYPE IF EXISTS user_role")
