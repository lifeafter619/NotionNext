<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import GiscusComment from './components/GiscusComment.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-footer-before>
      <GiscusComment />
    </template>
  </Layout>
</template>
