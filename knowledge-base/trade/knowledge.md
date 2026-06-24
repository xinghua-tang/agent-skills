# 交易域 (Trade) 知识库

## 名词解释
- **订单状态流转**: 待支付 -> 已支付 -> 已发货 -> 已完成 -> 已关闭
- **渠道**: 支付渠道（微信支付 wechat / 支付宝 alipay）
- **分账**: 订单支付后，将资金按比例分给多个接收方（如平台抽成 + 卖家收入）

## 依赖关系
- `trade.createOrder`: 依赖商品域提供 `sku_id`，依赖账号域提供 `buyer_id`
- `trade.payOrder`: 依赖交易域自身产生的 `order_id`
- `trade.initiateSplit`: 依赖 `order_id` 和 `payment_id`

## 业务规则
- 金额单位统一为 **分**（人民币）。
- 预售订单需先支付定金，尾款支付后才触发分账。