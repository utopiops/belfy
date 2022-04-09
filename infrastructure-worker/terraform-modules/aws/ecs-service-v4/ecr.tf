resource "aws_ecr_repository" "ecr" {
  for_each             = { for index, container in var.containers : container.name => container if length(container.image) == 0 }
  name                 = format("%s-%s-%s", var.environment, var.app_name, each.value.name) // e.g. [var.app_name]-[each.value.name] : [development-core]-[main]
  image_tag_mutability = "IMMUTABLE"
}

# resource "aws_ecr_lifecycle_policy" "foopolicy" {
#   repository = aws_ecr_repository.ecr.name

#   policy = <<EOF
# {
#     "rules": [
#       {
#             "rulePriority": 1,
#             "description": "Keep last 3 images",
#             "selection": {
#                 "tagStatus": "tagged",
#                 "tagPrefixList": ["master", "main"],
#                 "countType": "imageCountMoreThan",
#                 "countNumber": 3
#             },
#             "action": {
#                 "type": "expire"
#             }
#         },
#         {
#             "rulePriority": 1,
#             "description": "Expire images older than 7 days",
#             "selection": {
#                 "tagStatus": "untagged",
#                 "countType": "sinceImagePushed",
#                 "countUnit": "days",
#                 "countNumber": 7
#             },
#             "action": {
#                 "type": "expire"
#             }
#         }
#     ]
# }
# EOF
# }