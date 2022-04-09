resource "azurerm_storage_account" "this" {
  name                = local.application_name
  resource_group_name = local.env_resource_group_name

  location                 = local.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  static_website {
    index_document     = var.index_document
    error_404_document = var.error_document
  }

  tags = {
    "Created-By"  = "UTOPIOPS-WATER"
    "Environment" = var.environment
  }
}

resource "azurerm_cdn_profile" "this" {
  name                = local.application_name
  resource_group_name = local.env_resource_group_name
  location            = "westus" // TODO: fix this! this doesn't make sense. If I use location  might get the error: LocationNotAvailableForResourceType. 
  // List of available regions for the resource type is 'global,australiaeast,australiasoutheast,brazilsouth,canadacentral,canadaeast,centralindia,centralus,eastasia,eastus,eastus2,japaneast,japanwest,northcentralus,northeurope,southcentralus,southindia,southeastasia,westeurope,westindia,westus,westcentralus'.
  sku = var.cdn_sku_profile
  tags = {
    "Created-By"  = "UTOPIOPS-WATER"
    "Environment" = var.environment
  }
}


resource "azurerm_cdn_endpoint" "this" {
  name         = local.application_name
  profile_name = azurerm_cdn_profile.this.name
  location     = "westus" // TODO: fix this! this doesn't make sense. If I use location  might get the error: LocationNotAvailableForResourceType. 
  // List of available regions for the resource type is 'global,australiaeast,australiasoutheast,brazilsouth,canadacentral,canadaeast,centralindia,centralus,eastasia,eastus,eastus2,japaneast,japanwest,northcentralus,northeurope,southcentralus,southindia,southeastasia,westeurope,westindia,westus,westcentralus'.
  resource_group_name = local.env_resource_group_name
  origin_host_header  = azurerm_storage_account.this.primary_web_host

  origin {
    name      = "web"
    host_name = azurerm_storage_account.this.primary_web_host
  }

  delivery_rule {
    name  = "EnforceHTTPS"
    order = "1"

    request_scheme_condition {
      operator     = "Equal"
      match_values = ["HTTP"]
    }

    url_redirect_action {
      redirect_type = "Found"
      protocol      = "Https"
    }
  }

}

resource "null_resource" "enable_https" {
  # provisioner "local-exec" {
  #   command = "az login --service-principal --username $ARM_CLIENT_ID --password $ARM_CLIENT_SECRET --tenant $ARM_TENANT_ID"
  # }

  provisioner "local-exec" {
    command = "az cdn custom-domain enable-https -g ${local.env_resource_group_name} --profile-name ${azurerm_cdn_profile.this.name} --endpoint-name ${azurerm_cdn_endpoint.this.name} -n ${azurerm_cdn_endpoint_custom_domain.this.name}"
  }
  depends_on = [
    azurerm_cdn_endpoint.this,
    azurerm_cdn_endpoint_custom_domain.this
  ]
}


resource "azurerm_dns_cname_record" "this" {
  name                = var.app_name
  zone_name           = data.terraform_remote_state.environment_base.outputs.dns_zone_name
  resource_group_name = data.terraform_remote_state.environment_base.outputs.resource_group_name
  ttl                 = 300
  target_resource_id  = azurerm_cdn_endpoint.this.id
}

resource "azurerm_cdn_endpoint_custom_domain" "this" {
  name            = var.app_name
  cdn_endpoint_id = azurerm_cdn_endpoint.this.id
  host_name       = "${azurerm_dns_cname_record.this.name}.${data.terraform_remote_state.environment_base.outputs.dns_zone_name}"
}
