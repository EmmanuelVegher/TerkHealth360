-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "shift_date" DATE NOT NULL,
    "capture_mode" TEXT NOT NULL DEFAULT 'ONLINE',
    "device_id" TEXT,
    "device_type" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "geofence_status" TEXT,
    "photo_url" TEXT,
    "biometric_score" DOUBLE PRECISION,
    "verified_by" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'SYNCED',
    "synced_at" TIMESTAMP(3),
    "conflict_note" TEXT,
    "is_manual_entry" BOOLEAN NOT NULL DEFAULT false,
    "supervisor_id" TEXT,
    "supervisor_note" TEXT,
    "approved_at" TIMESTAMP(3),
    "cloud_fallback" BOOLEAN NOT NULL DEFAULT false,
    "exception_flag" BOOLEAN NOT NULL DEFAULT false,
    "audit_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "from_layer" TEXT,
    "to_layer" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_records_staff_id_shift_date_idx" ON "attendance_records"("staff_id", "shift_date");

-- CreateIndex
CREATE INDEX "attendance_records_sync_status_idx" ON "attendance_records"("sync_status");

-- CreateIndex
CREATE INDEX "attendance_records_capture_mode_idx" ON "attendance_records"("capture_mode");

-- CreateIndex
CREATE INDEX "system_events_event_type_created_at_idx" ON "system_events"("event_type", "created_at");
