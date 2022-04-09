#!/bin/bash
az_copy_to_blob_storage(){
   if [ $(az storage blob list --container-name "\$web" --account-name ${dest_storage_account_name} --connection-string ${source_conn_str} --query "length([])") -eq 0 ]; then
        echo "Blob container is empty. Skip removal.."
  else
    azcopy rm "https://${dest_storage_account_name}.blob.core.windows.net/\$web?${dest_sas_token}" --recursive=true
  fi
  azcopy cp "https://${storage_account_name}.blob.core.windows.net/releases/${release_version}/*?${source_sas_token}" "https://${dest_storage_account_name}.blob.core.windows.net/\$web?${dest_sas_token}" --recursive
}

az_copy_to_blob_storage
