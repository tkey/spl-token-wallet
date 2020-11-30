import { WEB_STORAGE_MODULE_NAME } from '@tkey/web-storage';
import { SECURITY_QUESTIONS_MODULE_NAME } from '@tkey/security-questions';
import { SHARE_SERIALIZATION_MODULE_NAME } from '@tkey/share-serialization';
import TorusStorageLayer from '@tkey/storage-layer-torus';
import createTKeyInstance, {
  verifierParams,
  THRESHOLD_KEY_PRIORITY_ORDER,
  CHROME_EXTENSION_STORAGE_MODULE_NAME,
  parseShares,
  METADATA_HOST,
  EMAIL_HOST,
  DAPP_NAME,
} from './tkeyUtils';

export class ThresholdKeyController {
  constructor() {
    this.tKey = null;
    this.settingsPageData = {};
    this.postboxKey = '';
    this.privKey = '';
    this.isShareInputRequired = false;
    this.isNewKey = false;
    this.directAuthResponse = undefined;
    console.log(this.tKey);
  }

  checkIfTKeyExists = async (postboxKey) => {
    try {
      if (!postboxKey) return;
      const storageLayer = new TorusStorageLayer({
        hostUrl: METADATA_HOST,
      });
      const metadata = await storageLayer.getMetadata({ privKey: postboxKey });
      this.isNewKey = Object.keys(metadata).length <= 0;
    } catch (error) {
      this.isNewKey = false;
    }
  };

  _init = async (postboxKey) => {
    this.postboxKey = postboxKey;
    await this.checkIfTKeyExists(postboxKey);
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
    this.directAuthResponse = await this.tKey.serviceProvider.triggerLogin(
      verifierParams,
    );
    this.postboxKey = this.tKey.serviceProvider.postboxKey.toString('hex');
    await this.checkIfTKeyExists(this.postboxKey);
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
    if (this.isNewKey) await this.sendMail();
    console.log(privKey.toString('hex'), 'reconstructed tkey');
    this.privKey = privKey.toString('hex');
  }

  sendMail = async () => {
    // create new share
    const shareCreated = await this.tKey.generateNewShare();
    await this.calculateSettingsPageData();
    const requiredShareStore =
      shareCreated.newShareStores[shareCreated.newShareIndex.toString('hex')];
    console.log(requiredShareStore.share);
    const serializedShare = await this.tKey.modules[
      SHARE_SERIALIZATION_MODULE_NAME
    ].serialize(requiredShareStore.share.share, 'mnemonic');
    // call api with new share
    fetch(EMAIL_HOST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: serializedShare,
        name: DAPP_NAME,
        email: this.directAuthResponse.userInfo.email,
      }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw res;
      })
      .then(() => {
        console.log('sent email successfully');
      })
      .catch(console.error);
  };

  inputExternalShare = async (mnemonicShare) => {
    const deserialiedShare = await this.tKey[
      SHARE_SERIALIZATION_MODULE_NAME
    ].deserialize(mnemonicShare, 'mnemonic');
    // call api with new share
    await this.tKey.inputShare(deserialiedShare);
    await this.calculateSettingsPageData();
    await this.finalizeTKey();
  };

  exportDeviceShare = async () => {
    return this.tKey.modules[WEB_STORAGE_MODULE_NAME].getDeviceShare();
  };
}
