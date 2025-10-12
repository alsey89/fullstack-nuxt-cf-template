export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
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
    },
  },
}));
