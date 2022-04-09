
arm_subscription_id="7b7d34f7-ff45-4205-b8eb-4c8947e24bdc"
arm_client_id="22f85859-7013-40f6-b5c7-622d8d5940ef"
arm_tenant_id="355dbc0b-dcd7-46a1-9e05-e58fdd8c2c06"
arm_client_secret="BD_G84tMsl_bDvOUJnGXcH4z2TBLKQrb7A"
environment = "test"
location="West US 2"
dns = {
  is_own = true
  parent_domain = "utopiops.com"
}
app_name = "test"

environment_state = {
  resource_group_name = "mohsentestresourc"
  container_name = "tfstate"
  key = "env-azure" // I made a mistake the key should be env-<envName> but I'm setting these values for manual test and in the app should be fine
  storage_account_name = "mohsentestaccount"
}

release_version = "1"