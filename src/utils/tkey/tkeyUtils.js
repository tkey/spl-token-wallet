import ThresholdKey from '@tkey/default';
import WebStorageModule, { WEB_STORAGE_MODULE_NAME } from '@tkey/web-storage';
import ServiceProviderBase from '@tkey/service-provider-base';
import SecurityQuestionsModule, {
  SECURITY_QUESTIONS_MODULE_NAME,
} from '@tkey/security-questions';
import bowser from 'bowser';

export const directParams = {
  baseUrl: `${window.location.origin}/serviceworker`,
  network: 'testnet',
  proxyContractAddress: '0x4023d2a0D330bF11426B12C6144Cfb96B7fa6183',
  enableLogging: true,
};

export const verifierParams = {
  verifier: 'google-lrc',
  clientId:
    '221898609709-obfn3p63741l5333093430j3qeiinaa8.apps.googleusercontent.com',
  typeOfLogin: 'google',
};

export const CHROME_EXTENSION_STORAGE_MODULE_NAME = 'chromeExtensionStorage';

export const THRESHOLD_KEY_PRIORITY_ORDER = [
  WEB_STORAGE_MODULE_NAME,
  SECURITY_QUESTIONS_MODULE_NAME,
  CHROME_EXTENSION_STORAGE_MODULE_NAME,
];

export default async function createTKeyInstance(postboxKey) {
  const modules = {
    [SECURITY_QUESTIONS_MODULE_NAME]: new SecurityQuestionsModule(),
    [WEB_STORAGE_MODULE_NAME]: new WebStorageModule(),
  };
  let serviceProvider;
  if (postboxKey) {
    serviceProvider = new ServiceProviderBase({ postboxKey });
  }
  const tKey = new ThresholdKey({
    modules,
    directParams,
    serviceProvider,
  });
  if (!postboxKey) {
    await tKey.serviceProvider.init({ skipSw: false });
  }
  return tKey;
}

export function parseShares(parsedShareDescriptions) {
  return parsedShareDescriptions.reduce((acc, x) => {
    const browserInfo = bowser.parse(x.userAgent);

    x.browserName =
      x.module === CHROME_EXTENSION_STORAGE_MODULE_NAME
        ? 'Chrome Extension'
        : `${browserInfo.browser.name}`;
    x.title = `${x.browserName}${
      x.module === CHROME_EXTENSION_STORAGE_MODULE_NAME
        ? ''
        : ` ${`V${browserInfo.browser.version}`}`
    }`;
    x.dateFormatted = new Date(x.dateAdded).toLocaleString();

    if (acc[x.shareIndex]) {
      acc[x.shareIndex].browsers = [...acc[x.shareIndex].browsers, x];
    } else {
      const deviceType =
        x.module === CHROME_EXTENSION_STORAGE_MODULE_NAME
          ? 'Chrome Extension'
          : capitalizeFirstLetter(browserInfo.platform.type);
      const deviceInfo = `${deviceType} - ${browserInfo.os.name}`;
      acc[x.shareIndex] = {
        index: x.shareIndex,
        osName: browserInfo.os.name,
        indexShort: x.shareIndex.slice(0, 4),
        icon: browserInfo.platform.type,
        groupTitle: deviceInfo,
        dateAdded: x.dateAdded,
        module: x.module,
        browsers: [x],
      };
    }

    return acc;
  }, {});
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
