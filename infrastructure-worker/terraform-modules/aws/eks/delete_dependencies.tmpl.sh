aws --region ${region} secretsmanager get-secret-value --secret-id ${kubeconfig_secret_arn} | jq -r .SecretString > temp_kubeconfig && \
kubectl --kubeconfig temp_kubeconfig delete ns ingress-nginx --ignore-not-found=true && \
kubectl --kubeconfig temp_kubeconfig delete ns utopiops --ignore-not-found=true && \
kubectl --kubeconfig temp_kubeconfig delete ns amazon-cloudwatch --ignore-not-found=true
