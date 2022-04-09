# How to set up dev environment
cp .env.dev .env
echo "isLocal=true" >> .env
echo "AWS_ACCESS_KEY_ID=[put actual value here - should have access to s3]" >> .env
echo "AWS_SECRET_ACCESS_KEY=[put actual value here - should have access to s3]" >> .env

