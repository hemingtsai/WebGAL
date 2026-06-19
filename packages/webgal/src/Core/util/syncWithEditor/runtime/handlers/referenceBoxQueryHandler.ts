import {
  createResponseEnvelope,
  ReferenceBoxQueryPayload,
  ReferenceBoxQueryResultPayload,
  RequestEnvelope,
  ResponseEnvelope,
} from '@/types/editorPreviewProtocol';

interface ReferenceBoxQueryStage {
  queryTargetReferenceBox(target: string): ReferenceBoxQueryResultPayload;
}

export function handleReferenceBoxQuery(
  request: RequestEnvelope<ReferenceBoxQueryPayload, 'preview.query.reference-box'>,
  pixiStage: ReferenceBoxQueryStage | null | undefined,
  isSupported = true,
): ResponseEnvelope<ReferenceBoxQueryResultPayload, 'preview.query.reference-box'> {
  if (!isSupported) {
    return createResponseEnvelope('preview.query.reference-box', request.requestId, {
      target: request.payload.target,
      status: 'unsupported',
      reason: '当前预览不支持 transform overlay reference box 查询',
    });
  }

  const { target } = request.payload;

  const result = pixiStage?.queryTargetReferenceBox(target) ?? {
    target,
    status: 'unsupported' as const,
    reason: 'Pixi stage 不可用',
  };

  return createResponseEnvelope('preview.query.reference-box', request.requestId, result);
}
