<template>
  <AlertDialog v-model:open="isOpen">
    <AlertDialogTrigger :as-child="true">
      <slot />
    </AlertDialogTrigger>
    <AlertDialogContent class="sm:max-w-[425px]">
      <AlertDialogHeader>
        <AlertDialogTitle> {{ props.title }} </AlertDialogTitle>
        <AlertDialogDescription>
          {{ props.text }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div v-if="props.askToNotify" class="flex gap-2 items-center">
        <input v-model="userIsNotified" type="checkbox" id="notifyParties" />
        <label for="notifyParties" class="text-sm text-black/50 hover:cursor-pointer select-none">{{
          props.askToNotifyText }}</label>
      </div>
      <div>
        <div>
          <p v-if="props.askToTypeConfirmation" class="text-sm text-black/50">
            Please type <span class="text-destructive font-semibold">"{{ props.confirmationText }}"</span>
            to
            proceed.
          </p>
        </div>
        <input v-if="props.askToTypeConfirmation" type="text" class="w-full p-2 mt-2 border border-gray-300 rounded-md"
          v-model="typedConfirmationText" />
      </div>
      <AlertDialogFooter class="flex flex-col gap-2">
        <AlertDialogCancel>
          No
        </AlertDialogCancel>
        <AlertDialogAction :disabled="props.askToTypeConfirmation && confirmationIsMatched === false" @click="onConfirm"
          :class="props.isDestructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''">
          Yes
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup>
import AlertDialog from '../ui/alert-dialog/AlertDialog.vue';
import AlertDialogTrigger from '../ui/alert-dialog/AlertDialogTrigger.vue';

const isOpen = ref(false);
const userIsNotified = ref(true);
const typedConfirmationText = ref("");
const confirmationIsMatched = computed(() => {
  return typedConfirmationText.value === props.confirmationText;
});

const props = defineProps(
  {
    title: {
      type: String,
      default: "Confirmation",
    },
    text: {
      type: String,
      default: "Are you sure you want to perform this action?",
    },
    isDestructive: {
      type: Boolean,
      default: false,
    },
    askToTypeConfirmation: {
      type: Boolean,
      default: false,
    },
    confirmationText: {
      type: String,
      default: "confirm",
    },
    askToNotify: {
      type: Boolean,
      default: false,
    },
    askToNotifyText: {
      type: String,
      default: "Notify relevant parties of this action?",
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
  }
)
const emits = defineEmits(['confirm']);
const onConfirm = () => {
  emits('confirm', userIsNotified.value);
  isOpen.value = false;
};
onMounted(() => {
  typedConfirmationText.value = "";
});
</script>