<template>
    <Button :disabled="isProcessing || props.disabled" @click="onClick" class="select-none">
        <template v-if="displayState === 'idle'">
            {{ props.idleLabel }}
        </template>
        <template v-else-if="displayState === 'processing'">
            <Icon name="lucide:loader" class="animate-spin mr-2" />
            {{ props.processingLabel }}
        </template>
        <template v-else-if="displayState === 'success'">
            <Icon name="line-md:confirm-circle" class="mr-2 text-green-400" />
            <span class="text-green-400">{{ props.successLabel }}</span>
        </template>
        <template v-else-if="displayState === 'failure'">
            <Icon name="line-md:close-circle" class="mr-2 text-red-400" />
            {{ props.failureLabel }}
        </template>
    </Button>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
    idleLabel: { type: String, default: 'Submit' },
    processingLabel: { type: String, default: 'Processing...' },
    successLabel: { type: String, default: 'Success!' },
    failureLabel: { type: String, default: 'Failed' },
    minDuration: { type: Number, default: 600 },       // minimum processing time
    resetDuration: { type: Number, default: 2000 },      // time to show success/failure
    disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

// internal
const displayState = ref('idle')
const isProcessing = ref(false)
let timer = null

// Expose API to parent via ref:
defineExpose({
    start,
    succeed,
    fail,
    reset,
})

function clearTimer() {
    if (timer) {
        clearTimeout(timer)
        timer = null
    }
}

async function start() {
    clearTimer()
    isProcessing.value = true
    displayState.value = 'processing'
}

async function succeed() {
    // ensure minDuration
    const elapsed = await waitMinDuration()
    displayState.value = 'success'
    // schedule reset
    timer = setTimeout(reset, props.resetDuration)
}

async function fail() {
    await waitMinDuration()
    displayState.value = 'failure'
    timer = setTimeout(reset, props.resetDuration)
}

function reset() {
    clearTimer()
    isProcessing.value = false
    displayState.value = 'idle'
}

function onClick() {
    if (displayState.value === 'idle') {
        emit('click')
    }
}

function waitMinDuration() {
    return new Promise(resolve => {
        // if we just switched to processing, wait remaining time
        timer = setTimeout(() => {
            timer = null
            resolve()
        }, props.minDuration)
    })
}
</script>
