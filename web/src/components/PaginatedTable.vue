<script setup lang="ts">
import type { Pkg } from "$data/schema.ts";
const { data } = defineProps<{
  data: Pkg[];
}>();
</script>

<script lang="ts">
const { data }: { data: Pkg[] } = $props();
</script>

<template>
  <span>hello</span>
</template>
