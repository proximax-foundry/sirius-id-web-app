<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeaderComponent from './components/headerComponent.vue';
</script>

<template>
  
  <div class="min-h-screen dark:bg-[#121212]" >
    <HeaderComponent/>
    <RouterView />

  </div>
</template>


