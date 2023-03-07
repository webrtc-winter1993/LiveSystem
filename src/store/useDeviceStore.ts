import { defineStore } from "pinia";
export const useDeviceStore = defineStore({
    id:'device',
    state:()=>{
        return {
            localDevice:<any>[]
        }
    },
    actions:{
        updated (val:any) {
            this.localDevice = val
        }
    }
})
