output "alb_dns" {
  description = "Backend ALB DNS name (API endpoint)"
  value       = aws_lb.backend.dns_name
}

output "frontend_url" {
  description = "Frontend CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  description = "S3 bucket for frontend deployment"
  value       = aws_s3_bucket.frontend.id
}

output "ecr_repo_url" {
  description = "ECR repository URL for backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}
