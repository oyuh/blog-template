<script setup lang="ts">
import { readSiteSettings, subscribeSiteSettings } from "@/utils/siteSettings";
import { onBeforeUnmount, onMounted, ref } from "vue";
import CommentsInner from "./CommentsInner.vue";

defineProps<{
	siteKey: string;
	resourceType: string;
	resourceId: string;
	variant?: "sidebar" | "overlay";
}>();

// Gate purely on the client. `enabled` deliberately starts `false` so the server
// render — and the first hydration render — produce no DOM. We read the real
// localStorage value in onMounted (post-hydration) so SSR and client stay in
// sync and CommentsInner is the only thing that ever owns the card DOM.
const enabled = ref(false);
let unsubscribe: (() => void) | null = null;

onMounted(() => {
	enabled.value = readSiteSettings().comments === "enabled";
	unsubscribe = subscribeSiteSettings((s) => {
		enabled.value = s.comments === "enabled";
	});
});

onBeforeUnmount(() => unsubscribe?.());
</script>

<template>
	<CommentsInner
		v-if="enabled"
		:site-key="siteKey"
		:resource-type="resourceType"
		:resource-id="resourceId"
		:variant="variant"
	/>
</template>
