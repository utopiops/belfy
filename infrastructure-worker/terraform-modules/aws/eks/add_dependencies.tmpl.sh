kubectl --kubeconfig ${kubeconfig} patch deployment coredns -n kube-system --patch "$(cat ${coredns-patch})" && \
kubectl --kubeconfig ${kubeconfig} apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cloudwatch-namespace.yaml && \
kubectl --kubeconfig ${kubeconfig} apply -f ${fluent_bit_configmap_path} -n amazon-cloudwatch && \
kubectl --kubeconfig ${kubeconfig} apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/fluent-bit/fluent-bit.yaml && \
helm repo add autoscaler https://kubernetes.github.io/autoscaler && \
helm --kubeconfig ${kubeconfig} upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler --namespace kube-system -f cluster_autoscaler_values.yaml --set "autoDiscovery.clusterName=${cluster_name},awsRegion=${region}" && \
helm repo add bitnami https://charts.bitnami.com/bitnami && \
kubectl --kubeconfig ${kubeconfig} apply -f ${external_dns_sa_path} -n kube-system && \
kubectl --kubeconfig ${kubeconfig} apply -f external_dns.yaml && \
helm --kubeconfig ${kubeconfig} upgrade --install external-dns bitnami/external-dns --namespace kube-system -f external_dns_values.yaml --set "aws.region=${region}" && \
helm repo add jetstack https://charts.jetstack.io && \
helm --kubeconfig ${kubeconfig} upgrade --install cert-manager jetstack/cert-manager --namespace cert-manager --set installCRDs=true --create-namespace --version v1.7.0 -f ${cert_manager_values_path} && \
kubectl --kubeconfig ${kubeconfig} apply -f ${letsencrypt_issuer_path} && \
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx && \
helm --kubeconfig ${kubeconfig} upgrade --install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace --set controller.metrics.enabled=true --set-string controller.podAnnotations."prometheus\.io/scrape"="true" --set-string controller.podAnnotations."prometheus\.io/port"="10254" && \
# helm repo add prometheus-community https://prometheus-community.github.io/helm-charts && \
# helm --kubeconfig ${kubeconfig} upgrade --install prometheus prometheus-community/prometheus --namespace prometheus --create-namespace --set alertmanager.persistentVolume.storageClass="gp2" && \
kubectl --kubeconfig ${kubeconfig} apply -f utopiops_namespace.yaml && \
kubectl --kubeconfig ${kubeconfig} apply -f ${helm_manager_sa_path} -n utopiops && \
kubectl --kubeconfig ${kubeconfig} apply -f ${helm_manager_deployment_path} -n utopiops && \
kubectl --kubeconfig ${kubeconfig} apply -f helm_manager_service.yaml -n utopiops && \
sleep 1m && \
aws --region ${region} ssm put-parameter --name ${helm_manager_service_param} --type "String" --value "$(kubectl --kubeconfig ${kubeconfig} -n utopiops get svc helm-manager-service -o json | jq .status.loadBalancer.ingress[0].hostname | tr -d '"'):3000" --overwrite
