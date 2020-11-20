import { WEB_STORAGE_MODULE_NAME } from '@tkey/web-storage';
import { SECURITY_QUESTIONS_MODULE_NAME } from '@tkey/security-questions';
import createTKeyInstance, {
  verifierParams,
  THRESHOLD_KEY_PRIORITY_ORDER,
  CHROME_EXTENSION_STORAGE_MODULE_NAME,
  parseShares,
} from './tkeyUtils';

export class ThresholdKeyController {
  constructor() {
    this.tKey = null;
    this.settingsPageData = {};
    this.postboxKey = '';
    this.privKey = '';
    this.isShareInputRequired = false;
  }

  _init = async (postboxKey) => {
    this.postboxKey = postboxKey;
    this.tKey = await createTKeyInstance(postboxKey);
    console.log(postboxKey, 'postboxkey');
    if (postboxKey) {
      await this._initializeAndCalculate();
      await this.finalizeTKey();
    }
  };

  _initializeAndCalculate = async () => {
    await this.tKey.initialize();
    await this.calculateSettingsPageData();
  };

  login = async () => {
    if (!this.tKey) throw new Error('Initialize first');
    if (this.postboxKey) return;
    await this.tKey.serviceProvider.triggerLogin(verifierParams);
    this.postboxKey = this.tKey.serviceProvider.postboxKey.toString('hex');
    await this._initializeAndCalculate();
    await this.finalizeTKey();
  };

  calculateSettingsPageData = async () => {
    const onDeviceShare = {};
    const passwordShare = {};

    const keyDetails = this.tKey.getKeyDetails();
    const {
      shareDescriptions,
      totalShares,
      threshold: thresholdShares,
    } = keyDetails;
    const parsedShareDescriptions = Object.keys(shareDescriptions)
      .map((x) => {
        return shareDescriptions[x].map((y) => {
          return { ...JSON.parse(y), shareIndex: x };
        });
      })
      .flatMap((x) => x)
      .sort((a, b) => {
        return (
          THRESHOLD_KEY_PRIORITY_ORDER.indexOf(a.module) -
          THRESHOLD_KEY_PRIORITY_ORDER.indexOf(b.module)
        );
      });

    // Total device shares
    const allDeviceShares = parseShares(
      parsedShareDescriptions.filter(
        (x) =>
          x.module === CHROME_EXTENSION_STORAGE_MODULE_NAME ||
          x.module === WEB_STORAGE_MODULE_NAME,
      ),
    );

    // For ondevice share
    try {
      const onDeviceLocalShare = await this.tKey.modules[
        WEB_STORAGE_MODULE_NAME
      ].getDeviceShare();
      if (onDeviceLocalShare) {
        onDeviceShare.available = true;
        onDeviceShare.share = onDeviceLocalShare;
      }
    } catch {
      onDeviceShare.available = false;
    }

    // password share
    const passwordModules = parsedShareDescriptions.filter(
      (x) => x.module === SECURITY_QUESTIONS_MODULE_NAME,
    );
    passwordShare.available = passwordModules.length > 0;

    // Current threshold
    const threshold = `${thresholdShares}/${totalShares}`;
    this.settingsPageData = {
      onDeviceShare,
      allDeviceShares,
      passwordShare,
      threshold,
      parsedShareDescriptions,
      keyDetails,
    };
  };

  async finalizeTKey() {
    const {
      keyDetails: { requiredShares },
    } = this.settingsPageData;
    if (requiredShares > 0) {
      try {
        await this.tKey.modules[
          WEB_STORAGE_MODULE_NAME
        ].inputShareFromWebStorage();
        this.isShareInputRequired = false;
      } catch (err) {
        console.warn("Couldn't find on device share");
        this.isShareInputRequired = true;
      }
    }
    const { privKey } = await this.tKey.reconstructKey();
    console.log(privKey.toString('hex'), 'reconstructed tkey');
    this.privKey = privKey.toString('hex');
  }

  async addDeviceShare(share) {
    await this.tKey.modules[WEB_STORAGE_MODULE_NAME].storeDeviceShare(share);
    await this.calculateSettingsPageData();
    await this.finalizeTKey();
  }
}
