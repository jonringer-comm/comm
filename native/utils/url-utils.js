// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { natDevHostname, checkForMissingNatDevHostname } from './dev-hostname';

const localhostHostname = 'localhost';
const localhostHostnameFromAndroidEmulator = '10.0.2.2';

const productionNodeServerURL = 'https://squadcal.org';
const devIsEmulator: boolean = __DEV__ && DeviceInfo.isEmulatorSync();

function getDevServerHostname(): string {
  invariant(__DEV__, 'getDevServerHostname called from production');
  if (!devIsEmulator) {
    checkForMissingNatDevHostname();
    return natDevHostname;
  } else if (Platform.OS === 'android') {
    return localhostHostnameFromAndroidEmulator;
  } else if (Platform.OS === 'ios') {
    return localhostHostname;
  }
  invariant(false, `unsupported platform: ${Platform.OS}`);
}

function getDevNodeServerURLFromHostname(hostname: string): string {
  return `http://${hostname}/comm`;
}

function getDevNodeServerURL(): string {
  invariant(__DEV__, 'getDevNodeServerURL called from production');
  const hostname = getDevServerHostname();
  return getDevNodeServerURLFromHostname(hostname);
}

const nodeServerOptions = [productionNodeServerURL];
if (Platform.OS === 'android') {
  nodeServerOptions.push(
    getDevNodeServerURLFromHostname(localhostHostnameFromAndroidEmulator),
  );
} else {
  nodeServerOptions.push(getDevNodeServerURLFromHostname(localhostHostname));
}

const defaultURLPrefix: string = __DEV__
  ? getDevNodeServerURL()
  : productionNodeServerURL;

const natNodeServer: string = getDevNodeServerURLFromHostname(natDevHostname);

const setCustomServer = 'SET_CUSTOM_SERVER';

export {
  defaultURLPrefix,
  getDevServerHostname,
  nodeServerOptions,
  natNodeServer,
  setCustomServer,
};
