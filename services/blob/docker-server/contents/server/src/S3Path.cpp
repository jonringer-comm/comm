#include "S3Path.h"

#include <algorithm>
#include <memory>
#include <stdexcept>
#include <string>

namespace comm {
namespace network {
namespace database {

S3Path::S3Path() {
}

S3Path::S3Path(const std::string bucketName, const std::string objectName)
    : bucketName(bucketName), objectName(objectName) {
}

S3Path::S3Path(const std::string fullPath) {
  if (std::count(fullPath.begin(), fullPath.end(), '/') != 1) {
    throw std::runtime_error(
        "incorrect number of delimiters in S3 path " + fullPath);
  }
  size_t delimiterPos = fullPath.find('/');
  this->bucketName = fullPath.substr(0, delimiterPos);
  this->objectName = fullPath.substr(delimiterPos + 1);
}

std::string S3Path::getBucketName() const {
  if (!this->bucketName.size()) {
    throw std::runtime_error("referencing S3 path with an empty bucket name");
  }
  return this->bucketName;
}

std::string S3Path::getObjectName() const {
  if (!this->bucketName.size()) {
    throw std::runtime_error("referencing S3 path with an empty object name");
  }
  return this->objectName;
}

std::string S3Path::getFullPath() const {
  return this->getBucketName() + "/" + this->getObjectName();
}

} // namespace database
} // namespace network
} // namespace comm
