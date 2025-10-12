import { defineStore } from "pinia";
import posthog from "posthog-js";

export const useCompanyStore = defineStore("company-store", {
  state: () => ({
    //company profile
    companyProfile: {},
    id: null,
    name: null,
    logoUrl: null,
    websiteUrl: null,
    email: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postalCode: null,
    defaultCurrency: null,

    //company locations
    locations: [],
    activeLocation: null,

    //company departments
    departments: [],
    activeDepartment: null,

    //company positions
    positions: [],
    activePosition: null,

    //company users
    users: [],
    activeUser: null,

    //company assignments
    assignments: [],
    activeAssignment: null,
    formItemEmploymentTypes: [],

    // company position hierarchy
    positionHierarchy: [],

    isLoading: false,
    error: null,
  }),
  getters: {},
  actions: {
    //////////////////////////////////////////////////////////////////////
    // Company Profile
    //////////////////////////////////////////////////////////////////////
    async fetchCompanyProfile() {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch("/v1/company", {
          method: "GET",
        });

        if (status === 200) {
          this.companyProfile = payload.data;
          this.id = payload.data.id;
          this.name = payload.data.name;
          this.logoUrl = payload.data.logoUrl;
          this.websiteUrl = payload.data.websiteUrl;
          this.email = payload.data.email;
          this.phone = payload.data.phone;
          this.address = payload.data.address;
          this.city = payload.data.city;
          this.state = payload.data.state;
          this.country = payload.data.country;
          this.postalCode = payload.data.postalCode;
          this.defaultCurrency = payload.data.defaultCurrency;

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
    async updateCompanyProfile({
      name,
      logoUrl,
      websiteUrl,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch("/v1/company", {
          method: "PUT",
          body: {
            name,
            logoUrl,
            websiteUrl,
            email,
            phone,
            address,
            city,
            state,
            country,
            postalCode,
          },
        });

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company profile updated successfully.",
          });
          await this.fetchCompanyProfile();
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
    // Company Locations
    //////////////////////////////////////////////////////////////////////
    async addCompanyLocation({
      name,
      description,
      isHQ = false, // Default to false, can be set to true if needed
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/location",
          {
            method: "POST",
            body: {
              name,
              description,
              isHQ, // Default to false, can be set to true if needed
              email,
              phone,
              address,
              city,
              state,
              country,
              postalCode,
            },
          }
        );

        if (status === 200 || status === 201) {
          showToast({
            title: "Success",
            description: "Company location added successfully.",
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
    async listCompanyLocations({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/location",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (status === 200) {
          this.locations = payload.data.locations;
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
    async fetchCompanyLocation({ locationId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/location/${locationId}`,
          {
            method: "GET",
          }
        );

        if (status === 200) {
          this.activeLocation = payload.data;
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
    async updateCompanyLocation({
      locationId,
      name,
      description,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/location/${locationId}`,
          {
            method: "PUT",
            body: {
              name,
              description,
              email,
              phone,
              address,
              city,
              state,
              country,
              postalCode,
            },
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company location updated successfully.",
          });
          await this.fetchCompanyLocation({ locationId });
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
    async deleteCompanyLocation({ locationId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/location/${locationId}`,
          {
            method: "DELETE",
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company location deleted successfully.",
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
    async setCompanyLocationAsHQ({ locationId }) {
      console.log("setting location as HQ", locationId);
      return true;
    },

    //////////////////////////////////////////////////////////////////////
    // Company Departments
    //////////////////////////////////////////////////////////////////////
    async listCompanyDepartments({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/department",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (status === 200) {
          this.departments = payload.data.departments;
          return true;
        } else {
          return [];
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchCompanyDepartment({ departmentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/department/${departmentId}`,
          {
            method: "GET",
          }
        );

        if (status === 200) {
          this.activeDepartment = payload.data;
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
    async addCompanyDepartment({ name, description, locationId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/department",
          {
            method: "POST",
            body: { name, description, locationId },
          }
        );

        if (status === 200 || status === 201) {
          showToast({
            title: "Success",
            description: "Company department added successfully.",
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
    async updateCompanyDepartment({
      departmentId,
      name,
      description,
      locationId,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/department/${departmentId}`,
          {
            method: "PUT",
            body: { name, description, locationId },
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company department updated successfully.",
          });
          await this.fetchCompanyDepartment({ departmentId });
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
    async deleteCompanyDepartment({ departmentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/department/${departmentId}`,
          {
            method: "DELETE",
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company department deleted successfully.",
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
    // Company Positions
    //////////////////////////////////////////////////////////////////////
    async listCompanyPositions({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/position",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (status === 200) {
          this.positions = payload.data.positions;
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
    async fetchCompanyPosition({ positionId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/position/${positionId}`,
          {
            method: "GET",
          }
        );

        if (status === 200) {
          this.activePosition = payload.data;
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
    async addCompanyPosition({
      name,
      description,
      departmentId,
      compRangeMin,
      compRangeMax,
      compRangeCurrency,
      compRangeInterval,
      desiredSkills,
      responsibilities,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/position",
          {
            method: "POST",
            body: {
              name,
              description,
              departmentId,
              compRangeMin,
              compRangeMax,
              compRangeCurrency,
              compRangeInterval,
              desiredSkills,
              responsibilities,
            },
          }
        );

        if (status === 200 || status === 201) {
          showToast({
            title: "Success",
            description: "Company position added successfully.",
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
    async updateCompanyPosition({
      positionId,
      name,
      description,
      departmentId,
      managerId,
      compRangeMin,
      compRangeMax,
      compRangeCurrency,
      compRangeInterval,
      desiredSkills,
      responsibilities,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/position/${positionId}`,
          {
            method: "PUT",
            body: {
              name,
              description,
              departmentId,
              managerId,
              compRangeMin,
              compRangeMax,
              compRangeCurrency,
              compRangeInterval,
              desiredSkills,
              responsibilities,
            },
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company position updated successfully.",
          });
          await this.fetchCompanyPosition({ positionId });
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
    async deleteCompanyPosition({ positionId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/position/${positionId}`,
          {
            method: "DELETE",
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company position deleted successfully.",
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
    // Company Users
    //////////////////////////////////////////////////////////////////////
    /**
     ** In the BE, users are categroized under the identity domain & not the company domain.
     ** Endpoint for admin access is /v1/user/*
     ** Endpoint for user access is /v1/user/profile
     **/

    async listCompanyUsers({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch("/v1/user", {
          method: "GET",
          params: { ...filters, ...pagination },
        });

        if (status === 200) {
          this.users = payload.data.users;
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
    async fetchCompanyUser({ userId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(`/v1/user/${userId}`, {
          method: "GET",
        });

        if (status === 200) {
          this.activeUser = payload.data;
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
    async addCompanyUser({ firstName, lastName, email }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch("/v1/user", {
          method: "POST",
          body: {
            firstName,
            lastName,
            email,
          },
        });

        if (status === 200 || status === 201) {
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
    async updateCompanyUser({
      userId,
      firstName,
      lastName,
      avatarUrl,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      emergencyContactFirstName,
      emergencyContactLastName,
      emergencyContactRelationship,
      emergencyContactEmail,
      emergencyContactPhone,
      emergencyContactAddress,
      emergencyContactCity,
      emergencyContactState,
      emergencyContactCountry,
      emergencyContactPostalCode,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(`/v1/user/${userId}`, {
          method: "PUT",
          body: {
            firstName,
            lastName,
            avatarUrl,
            phone,
            address,
            city,
            state,
            country,
            postalCode,
            emergencyContactFirstName,
            emergencyContactLastName,
            emergencyContactRelationship,
            emergencyContactEmail,
            emergencyContactPhone,
            emergencyContactAddress,
            emergencyContactCity,
            emergencyContactState,
            emergencyContactCountry,
            emergencyContactPostalCode,
          },
        });
        if (status === 200) {
          await this.fetchCompanyUser({ userId });
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
    async deleteCompanyUser({ userId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(`/v1/user/${userId}`, {
          method: "DELETE",
        });

        if (status === 200) {
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
    // Company Assignments
    //////////////////////////////////////////////////////////////////////

    async listCompanyAssignments({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/assignment",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (status === 200) {
          this.assignments = payload.data.assignments;
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
    async fetchCompanyAssignment({ assignmentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/assignment/${assignmentId}`,
          {
            method: "GET",
          }
        );

        if (status === 200) {
          this.activeAssignment = payload.data;
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
    async addCompanyAssignment({
      userId,
      positionId,
      departmentId,
      locationId,
      startedAt,
      endedAt,
      assignmentStatus,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/assignment",
          {
            method: "POST",
            body: {
              userId,
              positionId,
              departmentId,
              locationId,
              startedAt,
              endedAt,
              status: assignmentStatus,
            },
          }
        );

        if (status === 200 || status === 201) {
          showToast({
            title: "Success",
            description: "Company assignment added successfully.",
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
    async updateCompanyAssignment({
      assignmentId,
      userId,
      positionId,
      departmentId,
      locationId,
      startedAt,
      endedAt,
      assignmentStatus,
    }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/assignment/${assignmentId}`,
          {
            method: "PUT",
            body: {
              userId,
              positionId,
              departmentId,
              locationId,
              startedAt,
              endedAt,
              status: assignmentStatus,
            },
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company assignment updated successfully.",
          });
          await this.fetchCompanyAssignment({ assignmentId });
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
    async deleteCompanyAssignment({ assignmentId }) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();
      const showToast = useShowToast();

      try {
        const { status, payload } = await extendedFetch(
          `/v1/company/assignment/${assignmentId}`,
          {
            method: "DELETE",
          }
        );

        if (status === 200) {
          showToast({
            title: "Success",
            description: "Company assignment deleted successfully.",
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
    // Organization
    //////////////////////////////////////////////////////////////////////

    async listCompanyPositionHierarchy({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/organization/position/hierarchy",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (status === 200) {
          this.positionHierarchy = payload.data;
          return true;
        } else {
          false;
        }
      } catch (err) {
        this.error = err.message;
        return [];
      } finally {
        this.isLoading = false;
      }
    },

    //////////////////////////////////////////////////////////////////////
    // Form Items
    //////////////////////////////////////////////////////////////////////
    async listCompanyEmploymentTypes({ filters = {}, pagination = {} } = {}) {
      this.isLoading = true;
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch(
          "/v1/company/lookup/employment/type",
          {
            method: "GET",
            params: { ...filters, ...pagination },
          }
        );

        if (status === 200) {
          this.formItemEmploymentTypes = payload.data.map((item) => ({
            name: item,
            value: item,
          }));
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
    pick: ["formItemEmploymentTypes"],
  },
});
