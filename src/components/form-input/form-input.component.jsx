import { useId } from "react";

import { FormInputLabel, Input, Group } from "./form-input.styles";

const FormInput = ({ label, id: suppliedId, ...inputProps }) => {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;

  return (
    <Group>
      <FormInputLabel htmlFor={id}>{label}</FormInputLabel>
      <Input id={id} {...inputProps} />
    </Group>
  );
};

export default FormInput;
