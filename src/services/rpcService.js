const { rpc, TransactionBuilder } = require('@stellar/stellar-sdk');
const { AppError } = require('../utils/errors');

/** Keep only the fields consumers care about from one fee distribution. */
function normalizeFeeDistribution(d) {
  if (!d) return null;
  return {
    min: d.min,
    p50: d.p50,
    p90: d.p90,
    p99: d.p99,
    max: d.max,
    mode: d.mode,
    transactionCount: d.transactionCount,
    ledgerCount: d.ledgerCount,
  };
}

/**
 * All communication with Stellar RPC lives here, so routes stay thin and
 * tests can inject a fake `server`.
 */
class RpcService {
  constructor({ server, network, networkPassphrase }) {
    this.server = server;
    this.network = network;
    this.networkPassphrase = networkPassphrase;
  }

  async getHealth() {
    const h = await this.server.getHealth();
    return {
      status: h.status,
      latestLedger: h.latestLedger,
      oldestLedger: h.oldestLedger,
      ledgerRetentionWindow: h.ledgerRetentionWindow,
    };
  }

  async getNetworkInfo() {
    const [net, ledger] = await Promise.all([
      this.server.getNetwork(),
      this.server.getLatestLedger(),
    ]);
    return {
      network: this.network,
      passphrase: net.passphrase,
      protocolVersion: net.protocolVersion,
      latestLedger: ledger.sequence,
    };
  }

  /**
   * Normalized fee stats. Values are in stroops (1 XLM = 10,000,000 stroops)
   * and are returned as strings, exactly as RPC reports them.
   *
   * `suggested` is a simple heuristic on recent inclusion fees:
   * economy = p50, standard = p90, priority = p99.
   */
  async getFeeEstimate() {
    const stats = await this.server.getFeeStats();
    const classic = normalizeFeeDistribution(stats.inclusionFee);
    const soroban = normalizeFeeDistribution(stats.sorobanInclusionFee);
    return {
      network: this.network,
      latestLedger: stats.latestLedger,
      unit: 'stroops',
      classic,
      soroban,
      suggested: {
        classic: classic
          ? { economy: classic.p50, standard: classic.p90, priority: classic.p99 }
          : null,
        soroban: soroban
          ? { economy: soroban.p50, standard: soroban.p90, priority: soroban.p99 }
          : null,
      },
    };
  }

  /**
   * Simulate a base64 transaction envelope and return a cleaned-up result.
   * Simulation errors are returned as data (success: false), not thrown,
   * because "your transaction would fail" is a valid answer.
   */
  async simulate(xdr) {
    let tx;
    try {
      tx = TransactionBuilder.fromXDR(xdr, this.networkPassphrase);
    } catch (err) {
      throw new AppError(
        400,
        'INVALID_XDR',
        'Could not parse the transaction envelope for this network.'
      );
    }

    const sim = await this.server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(sim)) {
      return { success: false, latestLedger: sim.latestLedger, error: sim.error };
    }

    const retval = sim.result && sim.result.retval;
    return {
      success: true,
      latestLedger: sim.latestLedger,
      minResourceFee: sim.minResourceFee,
      cost: sim.cost
        ? { cpuInstructions: sim.cost.cpuInsns, memoryBytes: sim.cost.memBytes }
        : null,
      restoreRequired: rpc.Api.isSimulationRestore(sim),
      returnValueXdr:
        retval && typeof retval.toXDR === 'function' ? retval.toXDR('base64') : null,
    };
  }

  /** Basic account info: id and current sequence number. */
  async getAccount(accountId) {
    try {
      const account = await this.server.getAccount(accountId);
      return {
        id: account.accountId(),
        sequence: account.sequenceNumber(),
      };
    } catch (err) {
      if (/not found/i.test(err && err.message)) {
        throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found on this network.');
      }
      throw err;
    }
  }
}

module.exports = { RpcService, normalizeFeeDistribution };
