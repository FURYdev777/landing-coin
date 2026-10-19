import { getWallets } from 'https://esm.sh/@wallet-standard/app@1.1.1?bundle';

const registry = getWallets();
let selectedWallet = null;
let selectedAccount = null;
let offEvents = null;

function listWallets() {
  return registry.get().filter((wallet) => {
    const chains = Array.isArray(wallet.chains) ? wallet.chains : [];
    return chains.some((chain) => String(chain).startsWith('solana:')) &&
      wallet.features &&
      wallet.features['standard:connect'] &&
      wallet.features['solana:signAndSendTransaction'];
  });
}

function emitRegistryChange() {
  window.dispatchEvent(new CustomEvent('landing-wallets-changed'));
}

registry.on('register', emitRegistryChange);
registry.on('unregister', emitRegistryChange);

window.LandingWalletStandard = {
  list: listWallets,
  async connect(name) {
    const wallet = listWallets().find((item) => item.name === name);
    if (!wallet) throw new Error('That wallet is no longer available.');

    const feature = wallet.features['standard:connect'];
    const result = await feature.connect();
    const account = (result.accounts && result.accounts[0]) || (wallet.accounts && wallet.accounts[0]);

    if (!account || !account.address) throw new Error('The wallet did not return a Solana account.');

    if (offEvents) {
      try { offEvents(); } catch (error) {}
      offEvents = null;
    }

    selectedWallet = wallet;
    selectedAccount = account;

    const events = wallet.features['standard:events'];
    if (events && typeof events.on === 'function') {
      offEvents = events.on('change', (properties) => {
        const accounts = properties && Array.isArray(properties.accounts)
          ? properties.accounts
          : wallet.accounts;
        selectedAccount = accounts && accounts[0] ? accounts[0] : null;
        window.dispatchEvent(new CustomEvent('landing-wallet-account-changed', {
          detail: { address: selectedAccount ? selectedAccount.address : null }
        }));
      });
    }

    return { name: wallet.name, icon: wallet.icon || '', address: account.address };
  },
  async send(transaction) {
    if (!selectedWallet || !selectedAccount) throw new Error('Connect a wallet first.');

    const feature = selectedWallet.features['solana:signAndSendTransaction'];
    if (!feature || typeof feature.signAndSendTransaction !== 'function') {
      throw new Error('This wallet cannot send Solana transactions from this page.');
    }

    const serialized = new Uint8Array(transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }));

    const outputs = await feature.signAndSendTransaction({
      account: selectedAccount,
      transaction: serialized,
      chain: 'solana:mainnet',
      options: { skipPreflight: false }
    });

    const output = outputs && outputs[0];
    if (!output || !output.signature) throw new Error('The wallet did not return a transaction signature.');
    return output.signature;
  },
  async disconnect() {
    if (selectedWallet && selectedWallet.features['standard:disconnect']) {
      try { await selectedWallet.features['standard:disconnect'].disconnect(); } catch (error) {}
    }
    selectedWallet = null;
    selectedAccount = null;
    if (offEvents) {
      try { offEvents(); } catch (error) {}
      offEvents = null;
    }
  }
};

window.dispatchEvent(new CustomEvent('landing-wallet-standard-ready'));
