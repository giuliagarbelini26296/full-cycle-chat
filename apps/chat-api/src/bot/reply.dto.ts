import { EditMessageDto } from '../messages/edit-message.dto';
import { IsBoolean, IsOptional } from 'class-validator';

// A resposta do bot leva o texto com as regras da Mensagem (spec da F11, "Rotas do bot e
// credencial").
export class ReplyDto extends EditMessageDto {
  @IsOptional()
  @IsBoolean()
  business_data?: boolean;
}
