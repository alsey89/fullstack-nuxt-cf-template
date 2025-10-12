export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    // -------------------- English --------------------
    en: {
      auth: {
        signin: {
          title: "Welcome back!",
          email: {
            title: "Email",
            placeholder: "Email",
            formatErrMessage: "Email format is invalid.",
            requiredMessage: "Required",
          },
          password: {
            title: "Password",
            placeholder: "Password",
            requiredMessage: "Required",
          },
          forgotPasswordButton: "Forgot Password?",
          noAccountButton: "No account? Sign up",
          submitButton: "Sign In",
          submitting: "Signing in...",
          seperator: "or",
          socialLogin: {
            title: "Sign in with",
            google: "Google",
            line: "Line",
          },
          toast: {
            authRequired: {
              title: "Authentication Required",
              description:
                "Either your session has expired or you are not logged in.",
            },
          },
        },
        signup: {
          title: "Create an account",
          name: {
            title: "Name",
            placeholder: "Name",
            requiredMessage: "Required",
          },
          email: {
            title: "Email",
            placeholder: "Email",
            formatErrMessage: "Email format is invalid.",
            requiredMessage: "Required",
          },
          password: {
            title: "Password",
            placeholder: "Password",
            requiredMessage: "Required",
            formatErrMessage: "Password must be at least 8 characters long.",
          },
          confirmPassword: {
            title: "Confirm Password",
            placeholder: "Confirm Password",
            requiredMessage: "Required",
            matchErrMessage: "Passwords must match",
          },
          submitButton: "Sign Up",
          submitting: "Signing up...",
          haveAccountButton: "Already have an account? Sign in",
          seperator: "or",
          socialLogin: {
            title: "Sign up with",
            google: "Google",
            line: "Line",
          },
        },
      },
      errors: {
        // Authentication Errors (401)
        AUTH_REQUIRED: {
          title: "Authentication Required",
          description: "Please sign in to access this resource.",
        },
        INVALID_CREDENTIALS: {
          title: "Invalid Credentials",
          description: "The email or password you entered is incorrect.",
        },
        INVALID_TOKEN: {
          title: "Invalid Token",
          description:
            "The authentication token is invalid. Please sign in again.",
        },
        INVALID_TOKEN_PURPOSE: {
          title: "Invalid Token",
          description:
            "This token cannot be used for this action. Please try again.",
        },
        TOKEN_EXPIRED: {
          title: "Session Expired",
          description: "Your session has expired. Please sign in again.",
        },
        TENANT_MISMATCH: {
          title: "Tenant Mismatch",
          description: "You are not authorized to access this tenant.",
        },
        EMAIL_NOT_CONFIRMED: {
          title: "Email Not Confirmed",
          description: "Please confirm your email address to continue.",
          action: { label: "Resend Email" },
        },
        ACCOUNT_INACTIVE: {
          title: "Account Inactive",
          description:
            "Your account has been deactivated. Please contact support.",
          action: { label: "Contact Support" },
        },

        // Authorization Errors (403)
        FORBIDDEN: {
          title: "Access Denied",
          description: "You do not have permission to access this resource.",
        },
        PERMISSION_DENIED: {
          title: "Permission Denied",
          description:
            "You do not have the required permissions for this action.",
        },

        // Validation Errors (400)
        VALIDATION_ERROR: {
          title: "Validation Error",
          description: "Please check your input and try again.",
        },
        INVALID_INPUT: {
          title: "Invalid Input",
          description: "One or more fields contain invalid data.",
        },
        MISSING_FIELD: {
          title: "Missing Required Field",
          description: "Please fill in all required fields.",
        },

        // Password Validation Errors
        PASSWORD_TOO_SHORT: {
          title: "Password Too Short",
          description: "Password must be at least 8 characters long.",
        },
        PASSWORD_TOO_LONG: {
          title: "Password Too Long",
          description: "Password must be less than 128 characters.",
        },
        PASSWORD_MISSING_UPPERCASE: {
          title: "Password Requirements",
          description: "Password must contain at least one uppercase letter.",
        },
        PASSWORD_MISSING_LOWERCASE: {
          title: "Password Requirements",
          description: "Password must contain at least one lowercase letter.",
        },
        PASSWORD_MISSING_NUMBER: {
          title: "Password Requirements",
          description: "Password must contain at least one number.",
        },
        PASSWORD_MISSING_SPECIAL: {
          title: "Password Requirements",
          description: "Password must contain at least one special character.",
        },
        PASSWORD_SAME_AS_OLD: {
          title: "Password Already Used",
          description: "Please choose a different password.",
        },

        // Email Validation Errors
        INVALID_EMAIL_FORMAT: {
          title: "Invalid Email",
          description: "Please enter a valid email address.",
        },

        // Not Found Errors (404)
        NOT_FOUND: {
          title: "Not Found",
          description: "The requested resource was not found.",
        },
        USER_NOT_FOUND: {
          title: "User Not Found",
          description: "The requested user does not exist.",
        },
        COMPANY_NOT_FOUND: {
          title: "Company Not Found",
          description: "The requested company does not exist.",
        },

        // Conflict Errors (409)
        CONFLICT: {
          title: "Conflict",
          description: "This action conflicts with existing data.",
        },
        DUPLICATE: {
          title: "Duplicate Entry",
          description: "This entry already exists.",
        },
        EMAIL_EXISTS: {
          title: "Email Already Exists",
          description: "An account with this email address already exists.",
          action: { label: "Sign In" },
        },
        TENANT_ID_TAKEN: {
          title: "Tenant ID Taken",
          description:
            "This tenant ID is already in use. Please choose another.",
        },

        // Rate Limit Errors (429)
        RATE_LIMIT_EXCEEDED: {
          title: "Too Many Requests",
          description:
            "You have made too many requests. Please try again later.",
        },

        // Server Errors (500)
        INTERNAL_ERROR: {
          title: "Server Error",
          description:
            "An internal server error occurred. Please try again later.",
          action: { label: "Contact Support" },
        },
        DATABASE_ERROR: {
          title: "Database Error",
          description: "A database error occurred. Please try again later.",
          action: { label: "Contact Support" },
        },
        EXTERNAL_SERVICE_ERROR: {
          title: "Service Unavailable",
          description: "An external service is temporarily unavailable.",
        },

        // Business Logic Errors (422)
        BUSINESS_RULE_VIOLATION: {
          title: "Action Not Allowed",
          description: "This action violates a business rule.",
        },
        INVALID_STATE: {
          title: "Invalid State",
          description: "This action cannot be performed in the current state.",
        },

        // Unknown Error
        UNKNOWN_ERROR: {
          title: "Unexpected Error",
          description:
            "An unexpected error occurred. Please try again or contact support.",
          action: { label: "Contact Support" },
        },
      },
    },

    // -------------------- Chinese (Simplified) --------------------
    "zh-CN": {
      auth: {
        signin: {
          title: "欢迎回来！",
          email: {
            title: "邮箱",
            placeholder: "邮箱",
            formatErrMessage: "邮箱格式无效。",
            requiredMessage: "邮箱是必填项",
          },
          password: {
            title: "密码",
            placeholder: "密码",
            requiredMessage: "密码是必填项",
          },
          forgotPasswordButton: "忘记密码？",
          noAccountButton: "没有账号？注册",
          submitButton: "登录",
          submitting: "正在登录...",
          seperator: "或",
          socialLogin: {
            title: "使用以下方式登录",
            google: "Google",
            line: "Line",
          },
        },
        signup: {
          title: "创建账户",
          name: {
            title: "姓名",
            placeholder: "姓名",
            requiredMessage: "姓名是必填项",
          },
          email: {
            title: "邮箱",
            placeholder: "邮箱",
            formatErrMessage: "邮箱格式无效。",
            requiredMessage: "邮箱是必填项",
          },
          password: {
            title: "密码",
            placeholder: "密码",
            requiredMessage: "密码是必填项",
            formatErrMessage: "密码长度至少为8个字符。",
          },
          confirmPassword: {
            title: "确认密码",
            placeholder: "确认密码",
            requiredMessage: "确认密码是必填项",
            matchErrMessage: "两次输入的密码不一致",
          },
          submitButton: "注册",
          submitting: "正在注册...",
          haveAccountButton: "已有账号？登录",
          seperator: "或",
          socialLogin: {
            title: "使用以下方式注册",
            google: "Google",
            line: "Line",
          },
        },
      },
      errors: {
        // 认证错误 (401)
        AUTH_REQUIRED: {
          title: "需要身份验证",
          description: "请登录以访问此资源。",
        },
        INVALID_CREDENTIALS: {
          title: "凭据无效",
          description: "您输入的邮箱或密码不正确。",
        },
        INVALID_TOKEN: {
          title: "令牌无效",
          description: "身份验证令牌无效。请重新登录。",
        },
        INVALID_TOKEN_PURPOSE: {
          title: "令牌无效",
          description: "此令牌无法用于此操作。请重试。",
        },
        TOKEN_EXPIRED: {
          title: "会话已过期",
          description: "您的会话已过期。请重新登录。",
        },
        TENANT_MISMATCH: {
          title: "租户不匹配",
          description: "您无权访问此租户。",
        },
        EMAIL_NOT_CONFIRMED: {
          title: "邮箱未确认",
          description: "请确认您的邮箱地址以继续。",
          action: { label: "重新发送邮件" },
        },
        ACCOUNT_INACTIVE: {
          title: "账户已停用",
          description: "您的账户已被停用。请联系支持。",
          action: { label: "联系支持" },
        },

        // 授权错误 (403)
        FORBIDDEN: {
          title: "访问被拒绝",
          description: "您没有权限访问此资源。",
        },
        PERMISSION_DENIED: {
          title: "权限被拒绝",
          description: "您没有执行此操作所需的权限。",
        },

        // 验证错误 (400)
        VALIDATION_ERROR: {
          title: "验证错误",
          description: "请检查您的输入并重试。",
        },
        INVALID_INPUT: {
          title: "输入无效",
          description: "一个或多个字段包含无效数据。",
        },
        MISSING_FIELD: {
          title: "缺少必填字段",
          description: "请填写所有必填字段。",
        },

        // 密码验证错误
        PASSWORD_TOO_SHORT: {
          title: "密码太短",
          description: "密码长度必须至少为8个字符。",
        },
        PASSWORD_TOO_LONG: {
          title: "密码太长",
          description: "密码长度必须少于128个字符。",
        },
        PASSWORD_MISSING_UPPERCASE: {
          title: "密码要求",
          description: "密码必须包含至少一个大写字母。",
        },
        PASSWORD_MISSING_LOWERCASE: {
          title: "密码要求",
          description: "密码必须包含至少一个小写字母。",
        },
        PASSWORD_MISSING_NUMBER: {
          title: "密码要求",
          description: "密码必须包含至少一个数字。",
        },
        PASSWORD_MISSING_SPECIAL: {
          title: "密码要求",
          description: "密码必须包含至少一个特殊字符。",
        },
        PASSWORD_SAME_AS_OLD: {
          title: "密码已使用",
          description: "请选择不同的密码。",
        },

        // 邮箱验证错误
        INVALID_EMAIL_FORMAT: {
          title: "邮箱无效",
          description: "请输入有效的邮箱地址。",
        },

        // 未找到错误 (404)
        NOT_FOUND: {
          title: "未找到",
          description: "未找到请求的资源。",
        },
        USER_NOT_FOUND: {
          title: "用户未找到",
          description: "请求的用户不存在。",
        },
        COMPANY_NOT_FOUND: {
          title: "公司未找到",
          description: "请求的公司不存在。",
        },

        // 冲突错误 (409)
        CONFLICT: {
          title: "冲突",
          description: "此操作与现有数据冲突。",
        },
        DUPLICATE: {
          title: "重复条目",
          description: "此条目已存在。",
        },
        EMAIL_EXISTS: {
          title: "邮箱已存在",
          description: "使用此邮箱地址的账户已存在。",
          action: { label: "登录" },
        },
        TENANT_ID_TAKEN: {
          title: "租户ID已被占用",
          description: "此租户ID已在使用中。请选择其他ID。",
        },

        // 速率限制错误 (429)
        RATE_LIMIT_EXCEEDED: {
          title: "请求过多",
          description: "您发送了太多请求。请稍后重试。",
        },

        // 服务器错误 (500)
        INTERNAL_ERROR: {
          title: "服务器错误",
          description: "发生内部服务器错误。请稍后重试。",
          action: { label: "联系支持" },
        },
        DATABASE_ERROR: {
          title: "数据库错误",
          description: "发生数据库错误。请稍后重试。",
          action: { label: "联系支持" },
        },
        EXTERNAL_SERVICE_ERROR: {
          title: "服务不可用",
          description: "外部服务暂时不可用。",
        },

        // 业务逻辑错误 (422)
        BUSINESS_RULE_VIOLATION: {
          title: "操作不允许",
          description: "此操作违反了业务规则。",
        },
        INVALID_STATE: {
          title: "状态无效",
          description: "无法在当前状态下执行此操作。",
        },

        // 未知错误
        UNKNOWN_ERROR: {
          title: "意外错误",
          description: "发生意外错误。请重试或联系支持。",
          action: { label: "联系支持" },
        },
      },
    },

    // -------------------- Chinese (Traditional) --------------------
    "zh-TW": {
      auth: {
        signin: {
          title: "歡迎回來！",
          email: {
            title: "信箱",
            placeholder: "信箱",
            formatErrMessage: "信箱格式無效。",
            requiredMessage: "信箱為必填項",
          },
          password: {
            title: "密碼",
            placeholder: "密碼",
            requiredMessage: "密碼為必填項",
          },
          forgotPasswordButton: "忘記密碼？",
          noAccountButton: "沒有帳號？註冊",
          submitButton: "登入",
          submitting: "正在登入...",
          seperator: "或",
          socialLogin: {
            title: "使用以下方式登入",
            google: "Google",
            line: "Line",
          },
        },
        signup: {
          title: "建立帳號",
          name: {
            title: "姓名",
            placeholder: "姓名",
            requiredMessage: "姓名為必填項",
          },
          email: {
            title: "信箱",
            placeholder: "信箱",
            formatErrMessage: "信箱格式無效。",
            requiredMessage: "信箱為必填項",
          },
          password: {
            title: "密碼",
            placeholder: "密碼",
            requiredMessage: "密碼為必填項",
            formatErrMessage: "密碼至少需8個字元。",
          },
          confirmPassword: {
            title: "確認密碼",
            placeholder: "確認密碼",
            requiredMessage: "確認密碼為必填項",
            matchErrMessage: "兩次輸入的密碼不一致",
          },
          submitButton: "註冊",
          submitting: "正在註冊...",
          haveAccountButton: "已有帳號？登入",
          seperator: "或",
          socialLogin: {
            title: "使用以下方式註冊",
            google: "Google",
            line: "Line",
          },
        },
      },
      errors: {
        // 認證錯誤 (401)
        AUTH_REQUIRED: {
          title: "需要身份驗證",
          description: "請登入以存取此資源。",
        },
        INVALID_CREDENTIALS: {
          title: "憑證無效",
          description: "您輸入的信箱或密碼不正確。",
        },
        INVALID_TOKEN: {
          title: "令牌無效",
          description: "身份驗證令牌無效。請重新登入。",
        },
        INVALID_TOKEN_PURPOSE: {
          title: "令牌無效",
          description: "此令牌無法用於此操作。請重試。",
        },
        TOKEN_EXPIRED: {
          title: "會話已過期",
          description: "您的會話已過期。請重新登入。",
        },
        TENANT_MISMATCH: {
          title: "租戶不匹配",
          description: "您無權存取此租戶。",
        },
        EMAIL_NOT_CONFIRMED: {
          title: "信箱未確認",
          description: "請確認您的信箱地址以繼續。",
          action: { label: "重新發送郵件" },
        },
        ACCOUNT_INACTIVE: {
          title: "帳戶已停用",
          description: "您的帳戶已被停用。請聯絡支援。",
          action: { label: "聯絡支援" },
        },

        // 授權錯誤 (403)
        FORBIDDEN: {
          title: "存取被拒絕",
          description: "您沒有權限存取此資源。",
        },
        PERMISSION_DENIED: {
          title: "權限被拒絕",
          description: "您沒有執行此操作所需的權限。",
        },

        // 驗證錯誤 (400)
        VALIDATION_ERROR: {
          title: "驗證錯誤",
          description: "請檢查您的輸入並重試。",
        },
        INVALID_INPUT: {
          title: "輸入無效",
          description: "一個或多個欄位包含無效資料。",
        },
        MISSING_FIELD: {
          title: "缺少必填欄位",
          description: "請填寫所有必填欄位。",
        },

        // 密碼驗證錯誤
        PASSWORD_TOO_SHORT: {
          title: "密碼太短",
          description: "密碼長度必須至少為8個字元。",
        },
        PASSWORD_TOO_LONG: {
          title: "密碼太長",
          description: "密碼長度必須少於128個字元。",
        },
        PASSWORD_MISSING_UPPERCASE: {
          title: "密碼要求",
          description: "密碼必須包含至少一個大寫字母。",
        },
        PASSWORD_MISSING_LOWERCASE: {
          title: "密碼要求",
          description: "密碼必須包含至少一個小寫字母。",
        },
        PASSWORD_MISSING_NUMBER: {
          title: "密碼要求",
          description: "密碼必須包含至少一個數字。",
        },
        PASSWORD_MISSING_SPECIAL: {
          title: "密碼要求",
          description: "密碼必須包含至少一個特殊字元。",
        },
        PASSWORD_SAME_AS_OLD: {
          title: "密碼已使用",
          description: "請選擇不同的密碼。",
        },

        // 信箱驗證錯誤
        INVALID_EMAIL_FORMAT: {
          title: "信箱無效",
          description: "請輸入有效的信箱地址。",
        },

        // 未找到錯誤 (404)
        NOT_FOUND: {
          title: "未找到",
          description: "未找到請求的資源。",
        },
        USER_NOT_FOUND: {
          title: "使用者未找到",
          description: "請求的使用者不存在。",
        },
        COMPANY_NOT_FOUND: {
          title: "公司未找到",
          description: "請求的公司不存在。",
        },

        // 衝突錯誤 (409)
        CONFLICT: {
          title: "衝突",
          description: "此操作與現有資料衝突。",
        },
        DUPLICATE: {
          title: "重複條目",
          description: "此條目已存在。",
        },
        EMAIL_EXISTS: {
          title: "信箱已存在",
          description: "使用此信箱地址的帳戶已存在。",
          action: { label: "登入" },
        },
        TENANT_ID_TAKEN: {
          title: "租戶ID已被佔用",
          description: "此租戶ID已在使用中。請選擇其他ID。",
        },

        // 速率限制錯誤 (429)
        RATE_LIMIT_EXCEEDED: {
          title: "請求過多",
          description: "您發送了太多請求。請稍後重試。",
        },

        // 伺服器錯誤 (500)
        INTERNAL_ERROR: {
          title: "伺服器錯誤",
          description: "發生內部伺服器錯誤。請稍後重試。",
          action: { label: "聯絡支援" },
        },
        DATABASE_ERROR: {
          title: "資料庫錯誤",
          description: "發生資料庫錯誤。請稍後重試。",
          action: { label: "聯絡支援" },
        },
        EXTERNAL_SERVICE_ERROR: {
          title: "服務不可用",
          description: "外部服務暫時不可用。",
        },

        // 業務邏輯錯誤 (422)
        BUSINESS_RULE_VIOLATION: {
          title: "操作不允許",
          description: "此操作違反了業務規則。",
        },
        INVALID_STATE: {
          title: "狀態無效",
          description: "無法在當前狀態下執行此操作。",
        },

        // 未知錯誤
        UNKNOWN_ERROR: {
          title: "意外錯誤",
          description: "發生意外錯誤。請重試或聯絡支援。",
          action: { label: "聯絡支援" },
        },
      },
    },
  },
}));
