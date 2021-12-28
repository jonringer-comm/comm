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

/*
I created this class because I was experiencing crashes making calls to S3/DB
My guess is that the client classes are not thread safe so I went for frequent
spawning here. It may not be fully efficient but the important thing is that
it works with no crashes - it may not be that expensive though.
We could think of some "caching" here, like using threadlocal
So the objects aren't recreated all the time.
*/
class AwsObjectsFactory {
public:
  static std::shared_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
    static std::shared_ptr<Aws::DynamoDB::DynamoDBClient> client;
    if (client == nullptr) {
      Aws::Client::ClientConfiguration config;
      config.region = AWS_REGION;
      client = std::make_shared<Aws::DynamoDB::DynamoDBClient>(config);
    }
    return client;
  }

  static std::shared_ptr<Aws::S3::S3Client> getS3Client() {
    static std::shared_ptr<Aws::S3::S3Client> client;
    if (client == nullptr) {
      Aws::Client::ClientConfiguration config;
      config.region = AWS_REGION;
      client = std::make_shared<Aws::S3::S3Client>(config);
    }
    return client;
  }
};

} // namespace network
} // namespace comm
