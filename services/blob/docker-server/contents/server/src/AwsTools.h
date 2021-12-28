#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/s3/S3Client.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

const std::string AWS_REGION = "us-east-2";
const std::string BLOB_TABLE_NAME = "blob-service-blob";
const std::string REVERSE_INDEX_TABLE_NAME = "blob-service-reverse-index";
const std::string BLOB_BUCKET_NAME = "commapp-blob";

struct DynamoDBClientWrapper {
  std::shared_ptr<Aws::DynamoDB::DynamoDBClient> client;
  DynamoDBClientWrapper() {
    Aws::Client::ClientConfiguration config;
    config.region = AWS_REGION;
    client = std::make_shared<Aws::DynamoDB::DynamoDBClient>(config);
  }
};

struct S3ClientWrapper {
  std::shared_ptr<Aws::S3::S3Client> client;
  S3ClientWrapper() {
    Aws::Client::ClientConfiguration config;
    config.region = AWS_REGION;
    client = std::make_shared<Aws::S3::S3Client>(config);
  }
};

class AwsObjectsFactory {
public:
  static std::shared_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
    thread_local std::unique_ptr<DynamoDBClientWrapper> clientWrapper =
        std::make_unique<DynamoDBClientWrapper>();
    return clientWrapper->client;
  }

  static std::shared_ptr<Aws::S3::S3Client> getS3Client() {
    thread_local std::unique_ptr<S3ClientWrapper> clientWrapper =
        std::make_unique<S3ClientWrapper>();
    return clientWrapper->client;
  }
};

} // namespace network
} // namespace comm
