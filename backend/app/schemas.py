from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Login(Input):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=256)


class UserCreate(Input):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=254, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    password: str = Field(min_length=10, max_length=128)
    role: Literal['admin', 'user', 'reporter'] = 'user'
    active: bool = True
    token_limit: int = Field(default=100000, ge=0, le=100000000)


class UserUpdate(Input):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=254, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    password: str | None = Field(default=None, min_length=10, max_length=128)
    role: Literal['admin', 'user', 'reporter'] = 'user'
    active: bool = True
    token_limit: int = Field(default=100000, ge=0, le=100000000)


class ProductInput(Input):
    name: str = Field(min_length=2, max_length=160)
    brand: str = Field(default='', max_length=100)
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=5, max_length=5000)
    price: float = Field(default=0, ge=0, le=1000000)
    currency: str = Field(default='USD', pattern=r'^[A-Z]{3}$')
    external_id: int | None = Field(default=None, ge=1)
    is_demo: bool = True


class ReviewInput(Input):
    product_id: int = Field(ge=1)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=5, max_length=4000)
    source: str = Field(default='Demostración sintética', min_length=2, max_length=200)
    is_demo: bool = True


class ServiceInput(Input):
    slug: Literal['chat', 'explorar', 'alternativas']
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default='', max_length=1000)
    enabled: bool = True
    model: str = Field(min_length=2, max_length=120)
    max_output_tokens: int = Field(default=700, ge=128, le=2000)
    max_steps: int = Field(default=4, ge=2, le=6)


class Ask(Input):
    question: str = Field(min_length=3, max_length=2000)
    conversation_id: str | None = None
    product_id: int | None = Field(default=None, ge=1)

    @field_validator('question')
    @classmethod
    def clean_question(cls, value):
        if len(value.strip()) < 3:
            raise ValueError('Escribe una pregunta de al menos tres caracteres.')
        return value.strip()
