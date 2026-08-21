variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "ecr_image" {
  type    = string
  default = "dutchkem/prosuite:latest"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for the Fargate service"
  default     = ""
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for the Fargate service"
  default     = []
}

variable "task_cpu" {
  type    = string
  default = "512"
}

variable "task_memory" {
  type    = string
  default = "1024"
}

variable "desired_count" {
  type    = number
  default = 2
}

variable "log_level" {
  type    = string
  default = "info"
}

variable "certificate_arn" {
  type        = string
  description = "ARN of the ACM certificate for HTTPS"
  default     = ""
}
