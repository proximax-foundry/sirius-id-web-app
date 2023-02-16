<template>
  <div class="mx-12 md:mx-36 lg:mx-60 xl:mx-84 justify-center ">
      <div class="font-semibold mt-8 dark:text-white">Issue New SID</div>
      <div v-if="!isConnected" class="text-center text-red-600 bg-red-300 rounded-lg ml-auto mr-auto w-52 py-1.5">
          Wallet is not connected</div>
      <div class="mt-2 dark:text-white">Issuer private key (connected wallet's private key)</div>
      <TextInputVue placeholder="Issuer private key" v-model="privateKey" />
      <div class="mt-2 dark:text-white">Issuer Name</div>
      <TextInputVue placeholder="Issuer Name" v-model="issuerName" />
      <div class="mt-4 dark:text-white">Description</div>
      <textarea type="text " v-model="description" placeholder="Prepare a detailed description of your item"
          class="w-full px-3  py-1.5 mt-1 border focus:outline-none border-black"></textarea>
      <div class="mt-4 dark:text-white">Image URL</div>
      <TextInputVue placeholder="https://yoursite.io/item/123" v-model="imgUrl" />
      <div class="mt-4 dark:text-white">Name</div>
      <TextInputVue placeholder="Name" v-model="name" />
      <div class="mt-4 dark:text-white">Type</div>
      <TextInputVue placeholder="Type" v-model="type" />
      <div class="mt-4 dark:text-white">Email</div>
      <TextInputVue placeholder="Email" v-model="email" />
      <div class="mt-4 dark:text-white">Recipient</div>
      <TextInputVue placeholder="Recipient public key" v-model="recipient" />


      <button @click="createItem()"
          class="dark:bg-blue-600 flex px-5 ml-auto mr-auto mt-3 py-1.5 bg-blue-600 text-white rounded-md disabled:opacity-50"
          :disabled="disabledCreate">Issue SID</button>

      <!--qr modal-->
      <transition enter-active-class="animate__animated animate__fadeInDown"
          leave-active-class="animate__animated animate__fadeOutUp">
          <div v-if="toggleModal" class="popup-outer-lang absolute flex z-50 ">
              <div class="modal-popup-box ">
                  <div v-html="qr" class="w-8/12 ml-auto mr-auto py-3" />
                  <div class="text-gray-500 ml-auto mr-auto w-8/12">Please scan the QR above with Sirius Mobile App to
                      sign the transaction.</div>
                  <div @click="toggleModal = false; qr = ''"
                      class="cursor-pointer flex justify-center my-3 bg-blue-600 dark:bg-blue-600 w-24 rounded-lg text-white py-1.5 ml-auto mr-auto">
                      Close</div>
              </div>
          </div>
      </transition>
      <div @click="toggleModal=false;qr=''" v-if="toggleModal"
          class="fixed inset-0 opacity-50 bg-gray-600 dark:bg-[#171717] z-20"></div>
  </div>
</template>

<script lang="ts" setup>
import { AccountHttp, Address, AggregateBondedTransactionBuilder, AggregateCompleteTransactionBuilder, Convert, Deadline, EncryptedMessage, InnerTransaction, Mosaic, MosaicDefinitionTransactionBuilder, MosaicId, MosaicMetadataTransactionBuilder, MosaicNonce, MosaicProperties, MosaicSupplyChangeTransactionBuilder, MosaicSupplyType, NetworkType, PublicAccount, TransferTransactionBuilder, UInt64 } from 'tsjs-xpx-chain-sdk';
import { shallowRef, watch } from 'vue';
import TextInputVue from '@/components/TextInput.vue';
import { eagerComputed } from '@vueuse/shared';
import QRCode from 'qrcode'
import Peer from 'peerjs';


const isConnected = shallowRef(false)
const issuerName = shallowRef('')
const privateKey = shallowRef('')

const name = shallowRef('')
const type = shallowRef('')
const email = shallowRef('')
const description = shallowRef('')
const publicKey = shallowRef('')
const recipient = shallowRef('')
const imgUrl = shallowRef('')
const fetchSessionStorage = () => {
  const searchStorage = sessionStorage.getItem('userPublicKey')
  if (searchStorage != null) {
      publicKey.value = PublicAccount.createFromPublicKey(searchStorage, NetworkType.TEST_NET).publicKey
  } else {
      publicKey.value = ""
  }
}
const toggleModal = shallowRef(false)
const qr = shallowRef('')
const testnetUrl = 'https://api-2.testnet2.xpxsirius.io'

const resetInputs = () => {
  name.value = ''
  description.value = ''
  imgUrl.value = ''
  issuerName.value = ''
  type.value = ''
  email.value = ''
}

const createItem = async() => {
  const recipientPublicAccount = PublicAccount.createFromPublicKey(recipient.value, NetworkType.TEST_NET)
  const publicAccount = PublicAccount.createFromPublicKey(publicKey.value, NetworkType.TEST_NET)

  let encryptedCredential = EncryptedMessage.create(JSON.stringify({
          name: name.value,
          type: type.value,
          email: email.value,
      }),recipientPublicAccount,
      privateKey.value
  )
      
  const newValue = {
      issuer: issuerName.value,
      description: description.value,
      image: imgUrl.value,
      credentialPayload: encryptedCredential.payload
  }
  resetInputs()

  const accountHttp = new AccountHttp(testnetUrl)
  const assetDefinitionBuilder = new MosaicDefinitionTransactionBuilder()
  const nonce = MosaicNonce.createRandom();
  const assetDefinitionTx = assetDefinitionBuilder
      .deadline(Deadline.create())
      .mosaicNonce(nonce)
      .mosaicId(MosaicId.createFromNonce(nonce, publicAccount))
      .mosaicProperties(
          MosaicProperties.create({
              supplyMutable: false,
              transferable: false,
              divisibility: 0,
              duration: undefined
          })
      )
      .networkType(NetworkType.TEST_NET)
      .build()

  const assetSupplyChangeBuilder = new MosaicSupplyChangeTransactionBuilder()
  const assetSupplyChangeTx = assetSupplyChangeBuilder
      .deadline(Deadline.create())
      .mosaicId(assetDefinitionTx.mosaicId)
      .direction(MosaicSupplyType.Increase)
      .delta(UInt64.fromUint(1))
      .networkType(NetworkType.TEST_NET)
      .build()

  const mosaicMetadataBuilder = new MosaicMetadataTransactionBuilder()
  const mosaicMetadataTx = mosaicMetadataBuilder
      .deadline(Deadline.create())
      .targetPublicKey(publicAccount)
      .targetMosaicId(assetDefinitionTx.mosaicId)
      .scopedMetadataKey(UInt64.fromHex(Convert.utf8ToHex('sid.json')))
      .value(JSON.stringify(newValue))
      .oldValue('')
      .calculateDifferences()
      .networkType(NetworkType.TEST_NET)
      .build()
  const transferTxBuilder = new TransferTransactionBuilder()
  const transferTx = transferTxBuilder
      .deadline(Deadline.create())
      .recipient(recipientPublicAccount.address)
      .mosaics([new Mosaic(assetDefinitionTx.mosaicId,UInt64.fromUint(1))])
      .networkType(NetworkType.TEST_NET)
      .build()

      const innerTx: InnerTransaction[] = [
      assetDefinitionTx.toAggregate(publicAccount),
      assetSupplyChangeTx.toAggregate(publicAccount),
      mosaicMetadataTx.toAggregate(publicAccount),
      transferTx.toAggregate(publicAccount)
  ]
  
  const aggregateTxBuilder = new AggregateBondedTransactionBuilder() 
  const aggregateTx = aggregateTxBuilder
  .deadline(Deadline.create())
  .innerTransactions(innerTx)
  .networkType(NetworkType.TEST_NET)
  .build()
  const peer = new Peer()
  
  peer.on("open", async () => {
      const data = {
          payload: peer.id,
          type:'reqPeerID',
          generationHash: "56D112C98F7A7E34D1AEDC4BD01BC06CA2276DD546A93E36690B785E82439CA9", //testnet2
          callbackUrl: null,
          recvId: peer.id
      } 
      qr.value = await QRCode.toString(JSON.stringify(data))
      toggleModal.value = true

  })
  
  peer.on("connection", (conn) => {
      conn.on("data", async (data) => {
          let payload = {
              type: 'txn',
              payload: aggregateTx.serialize()
          }
          if(data == 'requestTxnSigning'){
              conn.send(payload) 
          }else if(data === 'txnHash'){
              conn.send("success"); 
          }
          console.log(data)
      });
  });

  return
}

const disabledCreate = eagerComputed(() => {
  return false
})

fetchSessionStorage()

watch(publicKey, n => {
  if (n.length) {
      isConnected.value = true
  } else {
      isConnected.value = false
  }
}, { immediate: true })
</script>

<style scoped>
.popup-outer-lang{
top: 80px; left: 0; right: 0; margin-left: auto; margin-right: auto; max-width: 500px;
}
.modal-popup-box{
@apply transition ease-in duration-300 w-[500px] bg-white shadow-xl rounded-2xl ;
}
</style>