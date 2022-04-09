resource "azurerm_storage_account" "release" {
  name                = format("%srelease", local.application_name)
  resource_group_name = local.env_resource_group_name

  location                 = local.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  tags = {
    "Created-By"  = "UTOPIOPS-WATER"
    "Environment" = var.environment
  }
}

resource "azurerm_storage_container" "release" {
  name                  = "releases"
  storage_account_name  = azurerm_storage_account.release.name
  container_access_type = "private"
}



data "azurerm_storage_account_blob_container_sas" "destination" {
  connection_string = azurerm_storage_account.this.primary_connection_string
  container_name    = "$web"
  https_only        = true


  start  = timestamp()
  expiry = timeadd(timestamp(), "24h")

  permissions {
    read   = true
    write  = true
    delete = true
    list   = true
    add    = true
    create = true
  }
}

data "azurerm_storage_account_blob_container_sas" "source" {
  connection_string = azurerm_storage_account.release.primary_connection_string
  container_name    = "releases"
  https_only        = true


  start  = timestamp()
  expiry = timeadd(timestamp(), "24h")

  permissions {
    read   = true
    write  = true
    delete = true
    list   = true
    add    = true
    create = true
  }
}

resource "null_resource" "copy_release_content" {

  for_each = toset(var.release_version != "" ? ["1"] : [])
  triggers = {
    release = var.release_version
  }
  provisioner "local-exec" {
    when = create
    command = templatefile("${path.module}/deploy.sh", {
      storage_account_name      = azurerm_storage_account.release.name
      dest_storage_account_name = azurerm_storage_account.this.name
      release_version           = var.release_version
      source_conn_str           = azurerm_storage_account.release.primary_connection_string
      dest_conn_str             = azurerm_storage_account.this.primary_connection_string
      source_sas_token          = substr(data.azurerm_storage_account_blob_container_sas.source.sas, 1, -1)      // Remove the initial questin mark
      dest_sas_token            = substr(data.azurerm_storage_account_blob_container_sas.destination.sas, 1, -1) // Remove the initial questin mark
    })
  }
}
