import styled from "styled-components";

export const FormInputLabel = styled.label`
  color: var(--ink);
  font-size: 0.81rem;
  font-weight: 700;
`;

export const Input = styled.input`
  display: block;
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 0;
  background: var(--paper);
  color: var(--ink);
  font: inherit;
  font-size: 1rem;

  &:focus {
    border-color: var(--olive);
    outline: 1px solid var(--olive);
    outline-offset: 0;
  }

  &[aria-invalid="true"] {
    border-color: #9b2f25;
  }
`;

export const Group = styled.div`
  display: grid;
  gap: 6px;
`;
