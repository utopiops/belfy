# The tools installed in the image:
#  * Terraform version ${TF_VERSION}
#  * aws cli v2
#  * gcloud cli: see https://cloud.google.com/sdk/docs/install#deb
#  * todo: azure cli (az)

FROM node:13.14.0

RUN curl --compressed -o- -L https://yarnpkg.com/install.sh | bash

ENV TF_VERSION 1.0.4
RUN apt-get update && \
    apt-get install -y zip && \
    curl -L https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip -o terraform.zip && \
    unzip terraform.zip && \
    chmod +x terraform && \
    mv terraform /usr/bin/terraform && \
    apt-get remove -y zip && \
    curl https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -f terraform.zip awscliv2.zip && \
    apt-get install -y apt-transport-https ca-certificates curl lsb-release gnupg && \
    curl -sL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | tee /etc/apt/trusted.gpg.d/microsoft.gpg > /dev/null && \
    AZ_REPO=$(lsb_release -cs) && \
    echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $AZ_REPO main" | tee /etc/apt/sources.list.d/azure-cli.list && \
    apt-get update && \
    apt-get install azure-cli=2.32.0-1~stretch && \
    curl -fsSLo /usr/share/keyrings/kubernetes-archive-keyring.gpg https://packages.cloud.google.com/apt/doc/apt-key.gpg  && \
    echo "deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | tee /etc/apt/sources.list.d/kubernetes.list && \
    apt-get update && \
    apt-get install -y kubectl && \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg  add - && apt-get update -y && apt-get install google-cloud-sdk -y && \
    curl https://get.helm.sh/helm-v3.8.0-rc.2-linux-amd64.tar.gz -o helm.targ.gz && \
    tar -zxvf helm.targ.gz && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    apt-get install -y jq
      

WORKDIR /usr/src/app

COPY providers.tf .
RUN mkdir -p /home/tf/mirrored_providers && \
    terraform providers mirror /home/tf/mirrored_providers
COPY terraform_config.conf /home/tf
ENV TF_CLI_CONFIG_FILE=/home/tf/terraform_config.conf

COPY package*.json ./

RUN yarn install --ignore-engines

COPY . .

CMD ["node", "./src/index.js"]