import { defineStore } from "pinia";
import posthog from "posthog-js";

export const useCompStore = defineStore("comp-store", {
  state: () => ({
    //compensation profile
    compProfiles: [],
    activeCompProfile: null,

    //pay periods
    payPeriods: [],
    activePayPeriod: null,

    //adjustments
    adjustments: [],
    payPeriodAdjustments: [],
    activeAdjustment: null,

    //payments
    allPayments: [], // Aggregated payments from all pay periods
    payPeriodPayments: [],
    activePayment: null,
    activePaymentBreakdown: null,

    //lookups
    paymentStatuses: [],

    isLoading: false,
    error: null,
  }),
  getters: {
    // Comp Profile getters
    getCompProfileById: (state) => (id) => {
      return state.compProfiles.find((profile) => profile.id === id);
    },

    // Pay Period getters
    getPayPeriodById: (state) => (id) => {
      return state.payPeriods.find((period) => period.id === id);
    },

    // Adjustment getters
    getAdjustmentById: (state) => (id) => {
      return state.adjustments.find((adjustment) => adjustment.id === id);
    },
    getPayPeriodAdjustmentById: (state) => (id) => {
      return state.payPeriodAdjustments.find(
        (adjustment) => adjustment.id === id
      );
    },

    // Payment getters
    getPaymentById: (state) => (id) => {
      return (
        state.allPayments.find((payment) => payment.id === id) ||
        state.payPeriodPayments.find((payment) => payment.id === id)
      );
    },
    getPayPeriodPaymentById: (state) => (id) => {
      return state.payPeriodPayments.find((payment) => payment.id === id);
    },
  },
  actions: {
    //////////////////////////////////////////////////////////////////////
    // Comp Profile
    //////////////////////////////////////////////////////////////////////
    async createCompProfile({
      userId,
      baseAmount,
      interval,
      currency,
      effectiveStart,
      effectiveEnd,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          "/v1/comp/profile",
          {
            method: "POST",
            body: {
              userId,
              baseAmount,
              interval,
              currency,
              effectiveStart,
              effectiveEnd,
            },
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Comp profile created",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.error(err);
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async listCompProfiles({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          "/v1/comp/profile",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (ok) {
          this.compProfiles = payload.data.compensationProfiles;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchCompProfile({ compProfileId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/profile/${compProfileId}`,
          {
            method: "GET",
          }
        );

        if (ok) {
          this.activeCompProfile = payload.data;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return null;
      } finally {
        this.isLoading = false;
      }
    },
    async updateCompProfile({
      compProfileId,
      userId,
      baseAmount,
      interval,
      currency,
      effectiveStart,
      effectiveEnd,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();
      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/profile/${compProfileId}`,
          {
            method: "PUT",
            body: {
              userId,
              baseAmount,
              interval,
              currency,
              effectiveStart,
              effectiveEnd,
            },
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Comp profile updated successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async deleteCompProfile({ compProfileId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/profile/${compProfileId}`,
          {
            method: "DELETE",
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Comp profile deleted successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    //////////////////////////////////////////////////////////////////////
    // Pay Period
    //////////////////////////////////////////////////////////////////////

    async generateUpcomingPayPeriods() {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          "/v1/comp/payperiod",
          {
            method: "POST",
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Pay period created successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async listPayPeriods({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          "/v1/comp/payperiod",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (ok) {
          this.payPeriods = payload.data.payPeriods;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchPayPeriod({ payPeriodId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payperiod/${payPeriodId}`,
          {
            method: "GET",
          }
        );

        if (ok) {
          this.activePayPeriod = payload.data;
          return payload.data;
        } else {
          return null;
        }
      } catch (err) {
        this.error = err.message;
        return null;
      } finally {
        this.isLoading = false;
      }
    },
    async updatePayPeriod({
      payPeriodId,
      name,
      description,
      startDate,
      endDate,
      paymentDate,
      status,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const {
          status: responseStatus,
          ok,
          payload,
        } = await extendedFetch(`/v1/comp/payperiod/${payPeriodId}`, {
          method: "PUT",
          body: {
            name,
            description,
            startDate,
            endDate,
            paymentDate,
            status,
          },
        });

        if (ok) {
          showToast({
            title: "Success",
            description: "Pay period updated successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    //////////////////////////////////////////////////////////////////////
    // Adjustments
    //////////////////////////////////////////////////////////////////////
    async createPayPeriodAdjustment({
      payPeriodId,
      userId,
      amount,
      adjustmentType,
      reason,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payperiod/${payPeriodId}/adjustment`,
          {
            method: "POST",
            body: {
              userId,
              amount,
              adjustmentType,
              reason,
            },
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Pay period adjustment created successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async listPayPeriodAdjustments({
      payPeriodId,
      filters = {},
      pagination = {},
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payperiod/${payPeriodId}/adjustment`,
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (ok) {
          this.payPeriodAdjustments = payload.data;
          console.log("Pay Period Adjustments:", this.payPeriodAdjustments);
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async listAllAdjustments({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          "/v1/comp/adjustment",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (ok) {
          this.adjustments = payload.data.adjustments;
          console.log("All Adjustments:", this.adjustments);
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchAdjustment({ adjustmentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/adjustment/${adjustmentId}`,
          {
            method: "GET",
          }
        );

        if (ok) {
          this.activeAdjustment = payload.data;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async deleteAdjustment({ adjustmentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/adjustment/${adjustmentId}`,
          {
            method: "DELETE",
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Pay period adjustment deleted successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    //////////////////////////////////////////////////////////////////////
    // Payment Records
    //////////////////////////////////////////////////////////////////////
    async createAllPaymentsForPayPeriod({ payPeriodId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payperiod/${payPeriodId}/payment`,
          {
            method: "POST",
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "All payments created successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async createSinglePaymentForPayPeriod({ userId, payPeriodId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payperiod/${payPeriodId}/payment/user/${userId}`,
          {
            method: "POST",
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Payment created successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async listAllPayments({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          "/v1/comp/payment",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (ok) {
          this.allPayments = payload.data.payments;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async listPaymentsForPayPeriod({
      payPeriodId,
      filters = {},
      pagination = {},
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payperiod/${payPeriodId}/payment`,
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (ok) {
          this.payPeriodPayments = payload.data;
          console.log("Pay Period Payments:", this.payPeriodPayments);
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchPaymentWithBreakdown({ paymentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payment/${paymentId}`,
          {
            method: "GET",
          }
        );

        if (ok) {
          this.activePayment = payload.data;

          // Also fetch the breakdown data for the details view
          const {
            status: breakdownStatus,
            ok: breakdownOk,
            payload: breakdownPayload,
          } = await extendedFetch(`/v1/comp/payment/${paymentId}/breakdown`, {
            method: "GET",
          });

          if (breakdownOk) {
            this.activePaymentBreakdown = breakdownPayload.data;
          }

          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async updatePayment({
      paymentId,
      status,
      currency,
      grossPay,
      netPay,
      paidDate,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const {
          status: responseStatus,
          ok,
          payload,
        } = await extendedFetch(`/v1/comp/payment/${paymentId}`, {
          method: "PUT",
          body: {
            status,
            currency,
            grossPay,
            netPay,
            paidDate,
          },
        });

        if (ok) {
          this.fetchPaymentWithBreakdown({ paymentId });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async deletePayment({ paymentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, ok, payload } = await extendedFetch(
          `/v1/comp/payment/${paymentId}`,
          {
            method: "DELETE",
          }
        );

        if (ok) {
          showToast({
            title: "Success",
            description: "Payment deleted successfully.",
          });
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    //////////////////////////////////////////////////////////////////////
    // Look Ups
    //////////////////////////////////////////////////////////////////////
    async fetchPaymentStatuses() {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, ok, payload } = await extendedFetch(
          "/v1/comp/lookup/payment/status",
          {
            method: "GET",
          }
        );

        if (ok) {
          this.paymentStatuses = payload.data;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        this.error = err.message;
        return [];
      } finally {
        this.isLoading = false;
      }
    },
  },
  persist: {
    pick: [],
  },
});
