import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function MinWords(minWords: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'MinWords',
      target: object.constructor,
      propertyName,
      constraints: [minWords],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const words = value.trim().split(/\s+/).filter(Boolean);
          return words.length >= (args.constraints[0] as number);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain at least ${args.constraints[0]} words`;
        },
      },
    });
  };
}
