variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name"
  default     = "celebratehub"
}

variable "environment" {
  description = "Environment name"
  default     = "prod"
}

variable "db_username" {
  description = "RDS master username"
  default     = "celebratehub"
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password"
  sensitive   = true
}

variable "backend_image_tag" {
  description = "Docker image tag for backend"
  default     = "latest"
}
