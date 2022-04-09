name        = "mohsendb"
environment = "mohsen"
environment_state = {
  bucket = "0c44bb81-a94c-49ea-9b9a-ac926a8067ac"
  key    = "utopiops-water/test/environment/mohsen.tfstate"
  region = "us-east-1"
}

allocated_storage = 20
storage_type      = "gp2"
engine            = "postgres"
family            = "postgres13"
engine_version    = "13.3"
instance_class    = "db.t3.micro"
initial_db_name   = "main_db"
username          = "mycooluser"
password          = "mycoolpassword"
port              = 5432

multi_az = false

iops = 0

publicly_accessible = false

allow_major_version_upgrade = false

auto_minor_version_upgrade = true

apply_immediately = false

maintenance_window = "Mon:00:00-Mon:03:00"

backup_retention_period = 1

backup_window = "09:46-10:16"

tags = {}


performance_insights_enabled = true
