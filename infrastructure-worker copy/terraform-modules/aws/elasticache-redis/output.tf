output "cluster" {
  value = {
    arn                            = aws_elasticache_replication_group.main.arn
    primary_endpoint_address       = aws_elasticache_replication_group.main.primary_endpoint_address
    reader_endpoint_address        = aws_elasticache_replication_group.main.reader_endpoint_address
    configuration_endpoint_address = aws_elasticache_replication_group.main.configuration_endpoint_address #This gets value when cluster mode is enabled
    engine_version_actual          = aws_elasticache_replication_group.main.engine_version_actual
    member_clusters                = aws_elasticache_replication_group.main.member_clusters
  }
}


# cluster = {
#   "arn" = "arn:aws:elasticache:us-east-2:994147050565:replicationgroup:mohsen-mytest-bwmhpnk0"
#   "configuration_endpoint_address" = "mohsen-mytest-bwmhpnk0.5fq1vd.clustercfg.use2.cache.amazonaws.com"
#   "engine_version_actual" = "6.0.5"
#   "member_clusters" = toset([
#     "mohsen-mytest-bwmhpnk0-0001-001",
#     "mohsen-mytest-bwmhpnk0-0001-002",
#   ])
#   "primary_endpoint_address" = tostring(null)
#   "reader_endpoint_address" = tostring(null)
# }