#pragma once

#include <memory>
#include <string>

#include <grpcpp/grpcpp.h>

#include "_generated/tunnelbroker.grpc.pb.h"
#include "_generated/tunnelbroker.pb.h"

namespace comm {
namespace network {

using grpc::Channel;
using tunnelbroker::CheckResponseType;
using tunnelbroker::TunnelBrokerService;

class Client {
  std::unique_ptr<TunnelBrokerService::Stub> stub_;
  const std::string id;
  const std::string deviceToken;

public:
  Client(
      std::string hostname,
      std::string port,
      std::shared_ptr<grpc::ChannelCredentials> credentials,
      const std::string id,
      const std::string deviceToken);

  CheckResponseType checkIfPrimaryDeviceOnline();
  bool becomeNewPrimaryDevice();
  void sendPong();
};

} // namespace network
} // namespace comm
