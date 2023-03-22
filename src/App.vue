<script setup lang="ts">
</script>

<template>
  <el-row :gutter="20">
    <el-col :span="24">
      <router-link to="/demo1">摄像头基础操作</router-link>
    </el-col>
    <el-col :span="24">
      <router-link to="/demo2">分享屏幕</router-link>
    </el-col>
    <el-col :span="24">
      <router-link to="/one2one">一对一视频</router-link>
    </el-col>
    <el-col :span="24">
      <router-link to="/one2many">一对多视频</router-link>
    </el-col>
    <el-col :span="24">
      <router-link to="/many2many">多对多视频</router-link>
    </el-col>
  </el-row>
  <RouterView/>
</template>

<style scoped>
</style>
