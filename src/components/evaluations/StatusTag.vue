<script setup lang="ts">
import Tag from "primevue/tag";
import type { EvaluationStatus } from "../../types/api";
import { statusLabels } from "../../utils/format";
defineProps<{ status: EvaluationStatus }>();
const severities = {
  Draft: "secondary",
  PendingUpload: "warn",
  Complete: "success",
  Rejected: "danger",
} as const;
</script>
<template>
  <Tag :value="statusLabels[status]" :severity="severities[status]" />
</template>
