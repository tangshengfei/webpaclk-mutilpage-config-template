<template>
    <h1>
        {{title}}
    </h1>
</template>
<script>
export default {
    name: "VDialog",
    props: ["title"],
    data(){
        return {
            
        }   
    }
}
</script>
<style scoped lang="less">
    h1{
        font-size: 22px;
    }
</style>

